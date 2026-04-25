import type {
  PortfolioPosition,
  PositionRecommendation,
  PositionRole,
  RiskBucket,
  StrategyBand,
  StrategyConfig,
  StrategyEvaluationResult,
} from "./types.js";
import { clamp, roundToUnit } from "./utils.js";

function assertValidBandRange(band: StrategyBand): void {
  if (band.min !== null && band.max !== null && band.min >= band.max) {
    throw new Error(`区间 ${band.id} 的 min 必须小于 max。`);
  }
}

export function resolveBand(
  temperature: number,
  bands: StrategyBand[],
): StrategyBand {
  for (const band of bands) {
    assertValidBandRange(band);
    const minOk = band.min === null || temperature >= band.min;
    const maxOk = band.max === null || temperature < band.max;
    if (minOk && maxOk) {
      return band;
    }
  }

  throw new Error(`未找到温度 ${temperature} 对应的策略区间。`);
}

function getRiskMultiplier(
  riskBucket: RiskBucket,
  strategy: StrategyConfig,
): number {
  return strategy.formula.riskMultipliers[riskBucket];
}

function getDurationFactor(
  durationYears: number,
  strategy: StrategyConfig,
): number {
  return clamp(
    durationYears / strategy.formula.durationScaleYears,
    strategy.formula.minDurationFactor,
    strategy.formula.maxDurationFactor,
  );
}

function getAdjustedSignal(
  position: PortfolioPosition,
  temperature: number,
  band: StrategyBand,
  strategy: StrategyConfig,
): number {
  let signal = band.signal;

  if (
    temperature >= strategy.formula.lowEntropyRange.min &&
    temperature <= strategy.formula.lowEntropyRange.max
  ) {
    signal *= strategy.formula.lowEntropyRange.damping;
  }

  if (
    temperature > strategy.formula.hotZone.thresholdTemperature &&
    position.durationYears > strategy.formula.hotZone.durationThresholdYears &&
    signal < 0
  ) {
    const exponent =
      (temperature - strategy.formula.hotZone.thresholdTemperature) /
      strategy.formula.hotZone.temperatureStep;
    signal *= Math.pow(strategy.formula.hotZone.exponentBase, exponent);
  }

  if (
    position.id === "xing-quan-wen-tai" &&
    position.role === "active" &&
    temperature < strategy.formula.activePriorityTemperature &&
    signal > 0
  ) {
    signal *= strategy.formula.activePriorityBoost;
  }

  return signal;
}

function getEffectiveMinValue(
  position: PortfolioPosition,
  strategy: StrategyConfig,
): number {
  const forcedMin = strategy.formula.activeMinValueById?.[position.id];
  return Math.max(position.minValue ?? 0, forcedMin ?? 0);
}

function getInterpolatedTargetWeight(
  position: PortfolioPosition,
  temperature: number,
): number | null {
  if (!position.temperatureTargetWeights) {
    return null;
  }

  const anchors = Object.entries(position.temperatureTargetWeights)
    .map(([key, value]) => ({ temperature: Number(key), value }))
    .filter((item) => Number.isFinite(item.temperature))
    .sort((a, b) => a.temperature - b.temperature);

  if (anchors.length === 0) {
    return null;
  }

  if (temperature <= anchors[0]!.temperature) {
    return anchors[0]!.value;
  }

  const lastAnchor = anchors[anchors.length - 1]!;
  if (temperature >= lastAnchor.temperature) {
    return lastAnchor.value;
  }

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const left = anchors[index]!;
    const right = anchors[index + 1]!;
    if (temperature >= left.temperature && temperature <= right.temperature) {
      const span = right.temperature - left.temperature;
      const ratio = span === 0 ? 0 : (temperature - left.temperature) / span;
      return left.value + (right.value - left.value) * ratio;
    }
  }

  return null;
}

function allocateByBaseWeights(
  positions: PortfolioPosition[],
  totalTargetValue: number,
  strategy: StrategyConfig,
): Map<string, number> {
  const targets = new Map<string, number>();
  const remaining = new Set(positions.map((position) => position.id));
  const byId = new Map(positions.map((position) => [position.id, position]));
  let remainingTotal = totalTargetValue;

  while (remaining.size > 0) {
    const flexible = [...remaining].map((id) => byId.get(id)!);
    const totalWeight = flexible.reduce(
      (sum, position) => sum + position.baseWeight,
      0,
    );
    let changed = false;

    for (const position of flexible) {
      const denominator = totalWeight > 0 ? totalWeight : flexible.length;
      const rawTarget =
        remainingTotal *
        (totalWeight > 0 ? position.baseWeight / denominator : 1 / denominator);
      const minValue = getEffectiveMinValue(position, strategy);
      const maxValue = position.maxValue ?? Number.POSITIVE_INFINITY;

      if (rawTarget < minValue) {
        targets.set(position.id, minValue);
        remaining.delete(position.id);
        remainingTotal -= minValue;
        changed = true;
        break;
      }

      if (rawTarget > maxValue) {
        targets.set(position.id, maxValue);
        remaining.delete(position.id);
        remainingTotal -= maxValue;
        changed = true;
        break;
      }
    }

    if (!changed) {
      for (const position of flexible) {
        const denominator = totalWeight > 0 ? totalWeight : flexible.length;
        const rawTarget =
          remainingTotal *
          (totalWeight > 0
            ? position.baseWeight / denominator
            : 1 / denominator);
        targets.set(position.id, rawTarget);
      }
      break;
    }
  }

  return targets;
}

function buildReason(
  position: PortfolioPosition,
  band: StrategyBand,
  strategy: StrategyConfig,
  adjustedSignal: number,
  targetWeight: number,
): string {
  const durationFactor = getDurationFactor(position.durationYears, strategy);
  const riskMultiplier = getRiskMultiplier(position.riskBucket, strategy);
  const roleLabel: Record<PositionRole, string> = {
    buffer: "缓冲池",
    active: "主动债",
    offensive: "进攻池",
  };

  return [
    `${roleLabel[position.role]}资产。`,
    `区间 ${band.label}，基础信号 ${band.signal.toFixed(2)}，调整后信号 ${adjustedSignal.toFixed(2)}。`,
    `久期 ${position.durationYears.toFixed(1)} 年，久期因子 ${durationFactor.toFixed(2)}，风险系数 ${riskMultiplier.toFixed(2)}。`,
    `目标权重 ${targetWeight.toFixed(4)}。`,
    position.id === "xing-quan-wen-tai" &&
    getEffectiveMinValue(position, strategy) >= 30000
      ? "已应用兴全稳泰A 3万元底仓保护。"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function decideAction(deltaValue: number): PositionRecommendation["action"] {
  if (deltaValue > 0) {
    return "buy";
  }
  if (deltaValue < 0) {
    return "sell";
  }
  return "hold";
}

export function evaluateStrategy(
  portfolio: PortfolioPosition[],
  strategy: StrategyConfig,
  temperature: number,
): StrategyEvaluationResult {
  const activePositions = portfolio.filter(
    (position) => position.enabled !== false,
  );
  if (activePositions.length === 0) {
    throw new Error("没有启用中的资产可供策略评估。");
  }
  // const mockTemperature = 58;

  // temperature = mockTemperature;

  const totalValue = activePositions.reduce(
    (sum, position) => sum + position.currentValue,
    0,
  );
  const totalValueBasis =
    totalValue > 0 ? totalValue : strategy.formula.targetTotalValue;

  const band = resolveBand(temperature, strategy.bands);
  const bufferPositions = activePositions.filter(
    (position) => position.role === "buffer",
  );
  const nonBufferPositions = activePositions.filter(
    (position) => position.role !== "buffer",
  );

  if (bufferPositions.length === 0) {
    throw new Error("至少需要一个缓冲池资产。");
  }

  const coldLiquidityReserve =
    temperature < 10 ? strategy.formula.coldLiquidityReserve : 0;
  const availableForNonBuffer = Math.max(
    0,
    totalValueBasis - coldLiquidityReserve,
  );

  const preliminaryTargets = nonBufferPositions.map((position) => {
    const manualTargetWeight = getInterpolatedTargetWeight(position, temperature);
    const adjustedSignal = getAdjustedSignal(
      position,
      temperature,
      band,
      strategy,
    );
    const durationFactor = getDurationFactor(position.durationYears, strategy);
    const riskMultiplier = getRiskMultiplier(position.riskBucket, strategy);
    const targetWeight = Math.max(
      0,
      manualTargetWeight !== null
        ? manualTargetWeight
        : position.baseWeight +
            adjustedSignal *
              durationFactor *
              riskMultiplier *
              strategy.formula.signalScale,
    );

    return {
      position,
      adjustedSignal,
      targetWeight,
      manualTargetWeight,
    };
  });

  const formulaDrivenTargets = preliminaryTargets.filter(
    (item) => item.manualTargetWeight === null,
  );
  const manualNonBufferValue = preliminaryTargets.reduce(
    (sum, item) => sum + totalValueBasis * (item.manualTargetWeight ?? 0),
    0,
  );
  const totalTargetWeight = formulaDrivenTargets.reduce(
    (sum, item) => sum + item.targetWeight,
    0,
  );
  const normalizationFactor =
    totalTargetWeight > 0 && totalValueBasis > 0
      ? Math.min(
          1,
          Math.max(0, availableForNonBuffer - manualNonBufferValue) /
            (totalValueBasis * totalTargetWeight),
        )
      : 1;

  const targetValues = new Map<string, number>();
  const targetWeights = new Map<string, number>();
  const adjustedSignals = new Map<string, number>();

  for (const item of preliminaryTargets) {
    const unclampedTargetValue =
      item.manualTargetWeight !== null
        ? totalValueBasis * item.manualTargetWeight
        : totalValueBasis * item.targetWeight * normalizationFactor;
    const minValue = getEffectiveMinValue(item.position, strategy);
    const maxValue = item.position.maxValue ?? Number.POSITIVE_INFINITY;
    const targetValue = clamp(unclampedTargetValue, minValue, maxValue);

    adjustedSignals.set(item.position.id, item.adjustedSignal);
    targetWeights.set(
      item.position.id,
      totalValueBasis === 0 ? 0 : targetValue / totalValueBasis,
    );
    targetValues.set(item.position.id, targetValue);
  }

  const committedNonBufferValue = nonBufferPositions.reduce(
    (sum, position) => sum + (targetValues.get(position.id) ?? 0),
    0,
  );
  const bufferTargetTotal = Math.max(
    coldLiquidityReserve,
    totalValueBasis - committedNonBufferValue,
  );
  const manualBufferTargets = new Map<string, number>();
  let remainingBufferTotal = bufferTargetTotal;

  for (const position of bufferPositions) {
    const manualTargetWeight = getInterpolatedTargetWeight(position, temperature);
    if (manualTargetWeight === null) {
      continue;
    }

    const minValue = getEffectiveMinValue(position, strategy);
    const maxValue = position.maxValue ?? Number.POSITIVE_INFINITY;
    const clampedTargetValue = clamp(
      totalValueBasis * manualTargetWeight,
      minValue,
      maxValue,
    );
    manualBufferTargets.set(position.id, clampedTargetValue);
    remainingBufferTotal -= clampedTargetValue;
  }

  const autoBufferPositions = bufferPositions.filter(
    (position) => !manualBufferTargets.has(position.id),
  );
  const bufferTargets = allocateByBaseWeights(
    autoBufferPositions,
    Math.max(0, remainingBufferTotal),
    strategy,
  );

  for (const position of bufferPositions) {
    const targetValue =
      manualBufferTargets.get(position.id) ??
      bufferTargets.get(position.id) ??
      position.currentValue;
    targetValues.set(position.id, targetValue);
    targetWeights.set(
      position.id,
      totalValueBasis === 0 ? 0 : targetValue / totalValueBasis,
    );
    adjustedSignals.set(position.id, 0);
  }

  const recommendations: PositionRecommendation[] = activePositions.map(
    (position) => {
      const targetValue = roundToUnit(
        targetValues.get(position.id) ?? position.currentValue,
        strategy.formula.roundingUnit,
      );
      const minValue = getEffectiveMinValue(position, strategy);
      const maxValue = position.maxValue ?? Number.POSITIVE_INFINITY;
      const projectedValue = clamp(targetValue, minValue, maxValue);
      const deltaValue = projectedValue - position.currentValue;
      const suggestedDeltaRatio =
        position.currentValue === 0 ? 0 : deltaValue / position.currentValue;
      const targetWeight =
        totalValueBasis === 0 ? 0 : projectedValue / totalValueBasis;

      return {
        positionId: position.id,
        name: position.name,
        category: position.category,
        role: position.role,
        durationYears: position.durationYears,
        riskBucket: position.riskBucket,
        currentValue: position.currentValue,
        currentWeight: totalValue > 0 ? position.currentValue / totalValue : 0,
        targetWeight,
        targetValue: projectedValue,
        suggestedDeltaValue: deltaValue,
        suggestedDeltaRatio,
        projectedValue,
        action: decideAction(deltaValue),
        reason: buildReason(
          position,
          band,
          strategy,
          adjustedSignals.get(position.id) ?? 0,
          targetWeight,
        ),
      };
    },
  );

  const totalBuyValue = recommendations
    .filter((item) => item.suggestedDeltaValue > 0)
    .reduce((sum, item) => sum + item.suggestedDeltaValue, 0);
  const totalSellValue = recommendations
    .filter((item) => item.suggestedDeltaValue < 0)
    .reduce((sum, item) => sum + Math.abs(item.suggestedDeltaValue), 0);

  return {
    band,
    totalValue,
    totalValueBasis,
    recommendations,
    totalBuyValue,
    totalSellValue,
    netDeltaValue: totalBuyValue - totalSellValue,
  };
}
