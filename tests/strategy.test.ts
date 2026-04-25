import { describe, expect, it } from "vitest";
import { evaluateStrategy, resolveBand } from "../src/strategy.js";
import type { PortfolioPosition, StrategyConfig } from "../src/types.js";

const sampleStrategy: StrategyConfig = {
  bands: [
    { id: "0to5", label: "0-5", min: 0, max: 5, signal: 0.95 },
    { id: "5to10", label: "5-10", min: 5, max: 10, signal: 0.72 },
    { id: "10to20", label: "10-20", min: 10, max: 20, signal: 0.48 },
    { id: "20to30", label: "20-30", min: 20, max: 30, signal: 0.18 },
    { id: "30to50", label: "30-50", min: 30, max: 50, signal: 0.04 },
    { id: "50to70", label: "50-70", min: 50, max: 70, signal: -0.18 },
    { id: "70to80", label: "70-80", min: 70, max: 80, signal: -0.42 },
    { id: "80to90", label: "80-90", min: 80, max: 90, signal: -0.68 },
    { id: "90to95", label: "90-95", min: 90, max: 95, signal: -0.9 },
    { id: "gte95", label: ">=95", min: 95, max: null, signal: -1.1 },
  ],
  formula: {
    targetTotalValue: 600000,
    signalScale: 0.11,
    durationScaleYears: 4,
    minDurationFactor: 0.3,
    maxDurationFactor: 2.2,
    riskMultipliers: {
      low: 0.9,
      medium: 1,
      high: 1.1,
    },
    roundingUnit: 100,
    lowEntropyRange: {
      min: 30,
      max: 50,
      damping: 0.2,
    },
    hotZone: {
      thresholdTemperature: 80,
      durationThresholdYears: 3,
      exponentBase: 1.8,
      temperatureStep: 5,
    },
    coldLiquidityReserve: 200000,
    activePriorityBoost: 1.35,
    activePriorityTemperature: 20,
    activeMinValueById: {
      "xing-quan-wen-tai": 30000,
    },
  },
};

const samplePortfolio: PortfolioPosition[] = [
  {
    id: "ultra-short",
    name: "超短债",
    category: "超短债",
    role: "buffer",
    baseWeight: 0.22,
    durationYears: 0.5,
    riskBucket: "low",
    currentValue: 150000,
    minValue: 80000,
    maxValue: 450000,
  },
  {
    id: "short",
    name: "中短债",
    category: "中短债",
    role: "buffer",
    baseWeight: 0.18,
    durationYears: 1,
    riskBucket: "low",
    currentValue: 150000,
    minValue: 80000,
    maxValue: 420000,
  },
  {
    id: "xing-quan-wen-tai",
    name: "兴全稳泰债券A",
    category: "主动债",
    role: "active",
    baseWeight: 0.1,
    durationYears: 2,
    riskBucket: "medium",
    currentValue: 60000,
    minValue: 30000,
    maxValue: 160000,
  },
  {
    id: "mid",
    name: "3-5年国开债",
    category: "中长债",
    role: "offensive",
    baseWeight: 0.09,
    durationYears: 4,
    riskBucket: "medium",
    currentValue: 120000,
    minValue: 0,
    maxValue: 140000,
  },
  {
    id: "long",
    name: "7-10年政金债",
    category: "长债",
    role: "offensive",
    baseWeight: 0.05,
    durationYears: 8,
    riskBucket: "high",
    currentValue: 120000,
    minValue: 0,
    maxValue: 120000,
  },
];

describe("resolveBand", () => {
  it.each([
    [0, "0to5"],
    [4, "0to5"],
    [5, "5to10"],
    [9, "5to10"],
    [10, "10to20"],
    [19, "10to20"],
    [20, "20to30"],
    [29, "20to30"],
    [30, "30to50"],
    [49, "30to50"],
    [50, "50to70"],
    [69, "50to70"],
    [70, "70to80"],
    [79, "70to80"],
    [80, "80to90"],
    [89, "80to90"],
    [90, "90to95"],
    [94, "90to95"],
    [95, "gte95"],
  ])("maps %s to %s", (temperature, expectedBandId) => {
    expect(resolveBand(temperature, sampleStrategy.bands).id).toBe(expectedBandId);
  });
});

describe("evaluateStrategy", () => {
  it("uses total value basis to start buying even from zero offensive holdings", () => {
    const result = evaluateStrategy(
      samplePortfolio.map((position) =>
        position.role === "offensive" ? { ...position, currentValue: 0 } : position,
      ),
      sampleStrategy,
      5,
    );

    const midBond = result.recommendations.find((item) => item.positionId === "mid");
    expect(result.totalValueBasis).toBeGreaterThan(0);
    expect(midBond?.suggestedDeltaValue).toBeGreaterThan(0);
  });

  it("keeps the liquidity reserve above 200000 when temperature is below 10", () => {
    const result = evaluateStrategy(samplePortfolio, sampleStrategy, 5);
    const bufferTotal = result.recommendations
      .filter((item) => item.role === "buffer")
      .reduce((sum, item) => sum + item.projectedValue, 0);

    expect(bufferTotal).toBeGreaterThanOrEqual(200000);
  });

  it("prioritizes xing-quan-wen-tai in cold bands and respects its 30000 floor", () => {
    const result = evaluateStrategy(samplePortfolio, sampleStrategy, 5);
    const active = result.recommendations.find((item) => item.positionId === "xing-quan-wen-tai");

    expect(active?.suggestedDeltaValue).toBeGreaterThan(0);
    expect(active?.projectedValue).toBeGreaterThan(active?.currentValue ?? 0);
    expect(active?.projectedValue).toBeGreaterThanOrEqual(30000);
  });

  it("forces fast retreat from long duration assets above 80 degrees", () => {
    const result = evaluateStrategy(samplePortfolio, sampleStrategy, 95);
    const longBond = result.recommendations.find((item) => item.positionId === "long");

    expect(longBond?.projectedValue).toBe(0);
    expect(longBond?.action).toBe("sell");
  });

  it("keeps the portfolio approximately cash-neutral after rebalancing", () => {
    const result = evaluateStrategy(samplePortfolio, sampleStrategy, 80);
    const projectedTotal = result.recommendations.reduce((sum, item) => sum + item.projectedValue, 0);

    expect(Math.abs(projectedTotal - result.totalValueBasis)).toBeLessThanOrEqual(300);
  });
});
