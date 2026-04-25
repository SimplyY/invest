import { describe, expect, it } from "vitest";
import { renderStrategyAlert } from "../src/report.js";
import type {
  ScrapedSnapshot,
  StrategyEvaluationResult,
} from "../src/types.js";

describe("renderStrategyAlert", () => {
  it("renders readable lines with summary", () => {
    const snapshot: ScrapedSnapshot = {
      temperature: 78,
      yieldRate: 1.78,
      dataDate: "2026年4月14日",
      sourceUrl: "https://youzhiyouxing.cn/data",
    };

    const evaluation: StrategyEvaluationResult = {
      band: { id: "70to80", label: "70-80", min: 70, max: 80, signal: -0.55 },
      totalValue: 100000,
      totalValueBasis: 100000,
      recommendations: [
        {
          positionId: "bond-a",
          name: "长债A",
          category: "长债",
          role: "offensive",
          durationYears: 8,
          riskBucket: "medium",
          currentValue: 50000,
          currentWeight: 0.5,
          targetWeight: 0.45,
          targetValue: 45000,
          suggestedDeltaValue: -5000,
          suggestedDeltaRatio: -0.1,
          projectedValue: 45000,
          action: "sell",
          reason: "测试原因",
        },
      ],
      totalBuyValue: 0,
      totalSellValue: 5000,
      netDeltaValue: -5000,
    };

    const markdown = renderStrategyAlert(snapshot, evaluation);
    expect(markdown).toContain("基金");
    expect(markdown).toContain("方向");
    expect(markdown).toMatch(/\|\s+1\s+\|\s+长·长债\s+\|\s+卖出\s+\|\s+5万\s+\|\s+-5千\s+\|\s+5万\s+\|/);
    expect(markdown).toContain("汇总");
  });

  it("abbreviates fund names with category tags and aligns columns", () => {
    const snapshot: ScrapedSnapshot = {
      temperature: 79,
      yieldRate: 1.76,
      dataDate: "2026年4月24日",
      sourceUrl: "https://youzhiyouxing.cn/data",
    };

    const evaluation: StrategyEvaluationResult = {
      band: { id: "70to80", label: "70-80", min: 70, max: 80, signal: -0.55 },
      totalValue: 600000,
      totalValueBasis: 600000,
      recommendations: [
        {
          positionId: "p1",
          name: "国泰利享中短债A",
          category: "中短债",
          role: "buffer",
          durationYears: 1,
          riskBucket: "low",
          currentValue: 220000,
          currentWeight: 0.37,
          targetWeight: 0.27,
          targetValue: 160000,
          suggestedDeltaValue: -60000,
          suggestedDeltaRatio: -0.27,
          projectedValue: 160000,
          action: "sell",
          reason: "",
        },
        {
          positionId: "p2",
          name: "易方达安悦超短债A",
          category: "超短债",
          role: "buffer",
          durationYears: 0.5,
          riskBucket: "low",
          currentValue: 200000,
          currentWeight: 0.33,
          targetWeight: 0.45,
          targetValue: 270000,
          suggestedDeltaValue: 70000,
          suggestedDeltaRatio: 0.35,
          projectedValue: 270000,
          action: "buy",
          reason: "",
        },
        {
          positionId: "p3",
          name: "兴全稳泰债券A",
          category: "主动债",
          role: "active",
          durationYears: 2,
          riskBucket: "low",
          currentValue: 80000,
          currentWeight: 0.13,
          targetWeight: 0.09,
          targetValue: 50000,
          suggestedDeltaValue: -30000,
          suggestedDeltaRatio: -0.375,
          projectedValue: 50000,
          action: "sell",
          reason: "",
        },
      ],
      totalBuyValue: 70000,
      totalSellValue: 90000,
      netDeltaValue: -20000,
    };

    const markdown = renderStrategyAlert(snapshot, evaluation);
    expect(markdown).toContain("国·中短债");
    expect(markdown).toContain("易·超短债");
    expect(markdown).toMatch(/\|\s+3\s+\|\s+兴·主动债\s+\|\s+卖出\s+\|\s+8万\s+\|\s+-3万\s+\|\s+5万\s+\|/);
    const tableLines = markdown.split("\n").filter((l) => l.startsWith("|"));
    expect(tableLines.length).toBeGreaterThanOrEqual(4);
  });

  it("formats sub-10k amounts in 千 and keeps # column width 2", () => {
    const snapshot: ScrapedSnapshot = {
      temperature: 79,
      yieldRate: 1.76,
      dataDate: "2026年4月24日",
      sourceUrl: "https://example.com",
    };
    const evaluation: StrategyEvaluationResult = {
      band: { id: "70to80", label: "70-80", min: 70, max: 80, signal: 0 },
      totalValue: 10000,
      totalValueBasis: 10000,
      recommendations: [
        {
          positionId: "small",
          name: "测试短债X",
          category: "超短债",
          role: "buffer",
          durationYears: 0.5,
          riskBucket: "low",
          currentValue: 1109,
          currentWeight: 0.1,
          targetWeight: 0.1,
          targetValue: 8200,
          suggestedDeltaValue: 7091,
          suggestedDeltaRatio: 0,
          projectedValue: 8200,
          action: "buy",
          reason: "",
        },
        {
          positionId: "tiny",
          name: "迷你债Y",
          category: "长债",
          role: "buffer",
          durationYears: 1,
          riskBucket: "low",
          currentValue: 10,
          currentWeight: 0,
          targetWeight: 0,
          targetValue: 0,
          suggestedDeltaValue: -10,
          suggestedDeltaRatio: 0,
          projectedValue: 0,
          action: "sell",
          reason: "",
        },
      ],
      totalBuyValue: 7091,
      totalSellValue: 10,
      netDeltaValue: 7081,
    };
    const markdown = renderStrategyAlert(snapshot, evaluation);
    expect(markdown).toMatch(/\|\s+1\s+\|\s+测·超短债\s+\|\s+买入\s+\|\s+1千\s+\|\s+\+7千\s+\|\s+8千\s+\|/);
    expect(markdown).toMatch(/\|\s+2\s+\|\s+迷·长债\s+\|\s+卖出\s+\|\s+10\s+\|\s+-10\s+\|\s+0\s+\|/);
  });
});
