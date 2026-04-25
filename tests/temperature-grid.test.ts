import { describe, expect, it } from "vitest";
import { evaluateStrategy } from "../src/strategy.js";
import {
  renderAmountMatrix,
  renderBandRow,
  renderDeltaMatrix,
  renderPoolMatrix,
} from "../src/scenarios/temperature-grid.js";
import type { PortfolioPosition, StrategyConfig } from "../src/types.js";

describe("temperature grid command", () => {
  it("renders strategy matrices for multiple temperature points", () => {
    const strategy: StrategyConfig = {
      bands: [
        { id: "0to10", label: "0-10", min: 0, max: 10, signal: 0.8 },
        { id: "10to80", label: "10-80", min: 10, max: 80, signal: 0 },
        { id: "gte80", label: ">=80", min: 80, max: null, signal: -0.8 },
      ],
      formula: {
        targetTotalValue: 600000,
        signalScale: 0.11,
        durationScaleYears: 4,
        minDurationFactor: 0.3,
        maxDurationFactor: 2.2,
        riskMultipliers: { low: 0.9, medium: 1, high: 1.1 },
        roundingUnit: 100,
        lowEntropyRange: { min: 30, max: 50, damping: 0.2 },
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

    const portfolio: PortfolioPosition[] = [
      {
        id: "buffer-a",
        name: "超短债",
        category: "超短债",
        role: "buffer",
        baseWeight: 0.22,
        durationYears: 0.5,
        riskBucket: "low",
        currentValue: 200000,
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
      },
      {
        id: "long-a",
        name: "7-10年政金债",
        category: "长债",
        role: "offensive",
        baseWeight: 0.05,
        durationYears: 8,
        riskBucket: "high",
        currentValue: 100000,
      },
    ];

    const temperatures = [0, 50, 100];
    const evaluations = temperatures.map((temperature) =>
      evaluateStrategy(portfolio, strategy, temperature),
    );

    const amountMatrix = renderAmountMatrix(portfolio, temperatures, evaluations);
    const deltaMatrix = renderDeltaMatrix(portfolio, temperatures, evaluations);
    const poolMatrix = renderPoolMatrix(temperatures, evaluations);
    const bandSummary = renderBandRow(temperatures, evaluations);

    expect(amountMatrix).toContain("基金");
    expect(amountMatrix).toContain("0°");
    expect(amountMatrix).toContain("50°");
    expect(amountMatrix).toContain("100°");
    expect(amountMatrix).toContain("兴全稳泰债券A");
    expect(deltaMatrix).toContain("7-10年政金债");
    expect(poolMatrix).toContain("缓冲池");
    expect(bandSummary).toContain("总资产基准");
  });
});
