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
    expect(markdown).toContain("1. 长债A | SELL -5,000");
    expect(markdown).toContain("当前金额 5万 操作金额 -5,000 操作后金额 4万");
    expect(markdown).toContain("汇总");
  });
});
