import { readFile } from "node:fs/promises";
import {
  DEFAULT_PORTFOLIO_PATH,
  DEFAULT_STRATEGY_PATH,
  PORTFOLIO_EXAMPLE_PATH,
  STRATEGY_EXAMPLE_PATH,
} from "./config.js";
import type {
  PortfolioPosition,
  PositionRole,
  RiskBucket,
  StrategyConfig,
} from "./types.js";

function parseJson(content: string, label: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON: ${(error as Error).message}`);
  }
}

async function readJsonFile(filePath: string, missingHint: string): Promise<unknown> {
  try {
    const content = await readFile(filePath, "utf8");
    return parseJson(content, filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${filePath} 不存在。请参考 ${missingHint} 创建对应文件。`);
    }

    throw error;
  }
}

function ensureObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function ensureNumber(value: unknown, message: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }

  return value;
}

function ensureString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }

  return value;
}

function ensureRiskBucket(value: unknown, message: string): RiskBucket {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  throw new Error(message);
}

function ensureRole(value: unknown, message: string): PositionRole {
  if (value === "buffer" || value === "active" || value === "offensive") {
    return value;
  }

  throw new Error(message);
}

function validatePortfolio(raw: unknown): PortfolioPosition[] {
  if (!Array.isArray(raw)) {
    throw new Error("portfolio.json 必须是数组。");
  }

  return raw.map((item, index) => {
    const obj = ensureObject(item, `portfolio.json 第 ${index + 1} 项必须是对象。`);
    const enabled = obj.enabled;
    const minValue = obj.minValue;
    const maxValue = obj.maxValue;
    const temperatureTargetWeights = obj.temperatureTargetWeights;

    if (enabled !== undefined && typeof enabled !== "boolean") {
      throw new Error(`portfolio.json 第 ${index + 1} 项 enabled 必须是布尔值。`);
    }

    if (minValue !== undefined && typeof minValue !== "number") {
      throw new Error(`portfolio.json 第 ${index + 1} 项 minValue 必须是数字。`);
    }

    if (maxValue !== undefined && typeof maxValue !== "number") {
      throw new Error(`portfolio.json 第 ${index + 1} 项 maxValue 必须是数字。`);
    }

    if (temperatureTargetWeights !== undefined) {
      const overrideObject = ensureObject(
        temperatureTargetWeights,
        `portfolio.json 第 ${index + 1} 项 temperatureTargetWeights 必须是对象。`,
      );

      for (const [key, value] of Object.entries(overrideObject)) {
        if (!Number.isFinite(Number(key))) {
          throw new Error(
            `portfolio.json 第 ${index + 1} 项 temperatureTargetWeights 的键必须是数字温度。`,
          );
        }
        if (typeof value !== "number" || Number.isNaN(value)) {
          throw new Error(
            `portfolio.json 第 ${index + 1} 项 temperatureTargetWeights.${key} 必须是数字。`,
          );
        }
        if (value < 0 || value > 1) {
          throw new Error(
            `portfolio.json 第 ${index + 1} 项 temperatureTargetWeights.${key} 必须在 0 到 1 之间。`,
          );
        }
      }
    }

    const position: PortfolioPosition = {
      id: ensureString(obj.id, `portfolio.json 第 ${index + 1} 项 id 缺失。`),
      name: ensureString(obj.name, `portfolio.json 第 ${index + 1} 项 name 缺失。`),
      category: ensureString(obj.category, `portfolio.json 第 ${index + 1} 项 category 缺失。`),
      role: ensureRole(obj.role, `portfolio.json 第 ${index + 1} 项 role 必须是 buffer / active / offensive。`),
      baseWeight: ensureNumber(
        obj.baseWeight,
        `portfolio.json 第 ${index + 1} 项 baseWeight 必须是数字。`,
      ),
      durationYears: ensureNumber(
        obj.durationYears,
        `portfolio.json 第 ${index + 1} 项 durationYears 必须是数字。`,
      ),
      riskBucket: ensureRiskBucket(
        obj.riskBucket,
        `portfolio.json 第 ${index + 1} 项 riskBucket 必须是 low / medium / high。`,
      ),
      currentValue: ensureNumber(
        obj.currentValue,
        `portfolio.json 第 ${index + 1} 项 currentValue 必须是数字。`,
      ),
    };

    if (position.baseWeight < 0) {
      throw new Error(`portfolio.json 第 ${index + 1} 项 baseWeight 不能为负数。`);
    }

    if (position.durationYears <= 0) {
      throw new Error(`portfolio.json 第 ${index + 1} 项 durationYears 必须大于 0。`);
    }

    if (minValue !== undefined) {
      position.minValue = minValue;
    }
    if (maxValue !== undefined) {
      position.maxValue = maxValue;
    }
    if (temperatureTargetWeights !== undefined) {
      position.temperatureTargetWeights = temperatureTargetWeights as Record<string, number>;
    }
    if (enabled !== undefined) {
      position.enabled = enabled;
    }

    return position;
  });
}

function validateStrategy(raw: unknown): StrategyConfig {
  const obj = ensureObject(raw, "strategy.json 必须是对象。");
  const bands = obj.bands;
  const formula = ensureObject(obj.formula, "strategy.json formula 缺失。");
  const riskMultipliers = ensureObject(
    formula.riskMultipliers,
    "strategy.json formula.riskMultipliers 缺失。",
  );
  const lowEntropyRange = ensureObject(
    formula.lowEntropyRange,
    "strategy.json formula.lowEntropyRange 缺失。",
  );
  const hotZone = ensureObject(formula.hotZone, "strategy.json formula.hotZone 缺失。");

  if (!Array.isArray(bands) || bands.length === 0) {
    throw new Error("strategy.json bands 必须是非空数组。");
  }

  return {
    bands: bands.map((band, index) => {
      const bandObj = ensureObject(band, `strategy.json bands 第 ${index + 1} 项必须是对象。`);
      const min = bandObj.min;
      const max = bandObj.max;

      if (min !== null && min !== undefined && typeof min !== "number") {
        throw new Error(`strategy.json bands 第 ${index + 1} 项 min 必须为数字或 null。`);
      }

      if (max !== null && max !== undefined && typeof max !== "number") {
        throw new Error(`strategy.json bands 第 ${index + 1} 项 max 必须为数字或 null。`);
      }

      return {
        id: ensureString(bandObj.id, `strategy.json bands 第 ${index + 1} 项 id 缺失。`),
        label: ensureString(bandObj.label, `strategy.json bands 第 ${index + 1} 项 label 缺失。`),
        min: (min ?? null) as number | null,
        max: (max ?? null) as number | null,
        signal: ensureNumber(
          bandObj.signal,
          `strategy.json bands 第 ${index + 1} 项 signal 必须是数字。`,
        ),
      };
    }),
    formula: {
      targetTotalValue: ensureNumber(
        formula.targetTotalValue,
        "strategy.json formula.targetTotalValue 必须是数字。",
      ),
      signalScale: ensureNumber(
        formula.signalScale,
        "strategy.json formula.signalScale 必须是数字。",
      ),
      durationScaleYears: ensureNumber(
        formula.durationScaleYears,
        "strategy.json formula.durationScaleYears 必须是数字。",
      ),
      minDurationFactor: ensureNumber(
        formula.minDurationFactor,
        "strategy.json formula.minDurationFactor 必须是数字。",
      ),
      maxDurationFactor: ensureNumber(
        formula.maxDurationFactor,
        "strategy.json formula.maxDurationFactor 必须是数字。",
      ),
      riskMultipliers: {
        low: ensureNumber(riskMultipliers.low, "strategy.json formula.riskMultipliers.low 必须是数字。"),
        medium: ensureNumber(
          riskMultipliers.medium,
          "strategy.json formula.riskMultipliers.medium 必须是数字。",
        ),
        high: ensureNumber(
          riskMultipliers.high,
          "strategy.json formula.riskMultipliers.high 必须是数字。",
        ),
      },
      roundingUnit: ensureNumber(
        formula.roundingUnit,
        "strategy.json formula.roundingUnit 必须是数字。",
      ),
      lowEntropyRange: {
        min: ensureNumber(lowEntropyRange.min, "strategy.json formula.lowEntropyRange.min 必须是数字。"),
        max: ensureNumber(lowEntropyRange.max, "strategy.json formula.lowEntropyRange.max 必须是数字。"),
        damping: ensureNumber(
          lowEntropyRange.damping,
          "strategy.json formula.lowEntropyRange.damping 必须是数字。",
        ),
      },
      hotZone: {
        thresholdTemperature: ensureNumber(
          hotZone.thresholdTemperature,
          "strategy.json formula.hotZone.thresholdTemperature 必须是数字。",
        ),
        durationThresholdYears: ensureNumber(
          hotZone.durationThresholdYears,
          "strategy.json formula.hotZone.durationThresholdYears 必须是数字。",
        ),
        exponentBase: ensureNumber(
          hotZone.exponentBase,
          "strategy.json formula.hotZone.exponentBase 必须是数字。",
        ),
        temperatureStep: ensureNumber(
          hotZone.temperatureStep,
          "strategy.json formula.hotZone.temperatureStep 必须是数字。",
        ),
      },
      coldLiquidityReserve: ensureNumber(
        formula.coldLiquidityReserve,
        "strategy.json formula.coldLiquidityReserve 必须是数字。",
      ),
      activePriorityBoost: ensureNumber(
        formula.activePriorityBoost,
        "strategy.json formula.activePriorityBoost 必须是数字。",
      ),
      activePriorityTemperature: ensureNumber(
        formula.activePriorityTemperature,
        "strategy.json formula.activePriorityTemperature 必须是数字。",
      ),
      activeMinValueById: (formula.activeMinValueById ?? {}) as Record<string, number>,
    },
  };
}

export async function loadPortfolio(
  portfolioPath = DEFAULT_PORTFOLIO_PATH,
): Promise<PortfolioPosition[]> {
  const raw = await readJsonFile(portfolioPath, PORTFOLIO_EXAMPLE_PATH);
  const portfolio = validatePortfolio(raw);

  if (portfolio.length === 0) {
    throw new Error("portfolio.json 不能为空。");
  }

  return portfolio;
}

export async function loadStrategy(
  strategyPath = DEFAULT_STRATEGY_PATH,
): Promise<StrategyConfig> {
  const raw = await readJsonFile(strategyPath, STRATEGY_EXAMPLE_PATH);
  return validateStrategy(raw);
}
