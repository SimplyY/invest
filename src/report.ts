import type { ScrapedSnapshot, StrategyEvaluationResult } from "./types.js";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from "./utils.js";

export function renderDailyCheckin(
  snapshot: ScrapedSnapshot,
  evaluation: StrategyEvaluationResult,
  shouldTrigger: boolean,
): string {
  return [
    "债券环境打卡",
    "",
    `数据日期：${snapshot.dataDate}`,
    `债市温度：${snapshot.temperature.toFixed(0)}°`,
    `10年期国债到期收益率：${snapshot.yieldRate.toFixed(2)}%`,
    `当前区间：${evaluation.band.label}`,
    `本次是否触发策略：${shouldTrigger ? "是" : "否"}`,
    `组合总资产：${formatCurrency(evaluation.totalValue)}`,
  ].join("\n");
}

export function renderStrategyAlert(
  snapshot: ScrapedSnapshot,
  evaluation: StrategyEvaluationResult,
): string {
  const lines = [
    `债券组合调仓建议（温度 ${snapshot.temperature.toFixed(0)}° / 区间 ${evaluation.band.label}）`,
    "",
    `数据日期：${snapshot.dataDate}，10年期国债到期收益率 ${snapshot.yieldRate.toFixed(2)}%。`,
    "",
  ];

  evaluation.recommendations.forEach((item, index) => {
    // if (index === 0) {
    //   lines.push(`   原因：${item.reason.replace(/\|/g, "/")}`);
    // }
    lines.push(
      `${index + 1}. ${item.name} | ${item.action.toUpperCase()} ${formatSignedCurrency(item.suggestedDeltaValue)}`,
    );
    // lines.push(
    //   `   分类 ${item.category}，久期 ${item.durationYears.toFixed(1)} 年，风险 ${item.riskBucket}，当前权重 ${formatPercent(item.currentWeight)}`,
    // );
    lines.push(
      `   当前金额 ${formatCurrency(item.currentValue)} 操作金额 ${formatCurrency(item.projectedValue - item.currentValue)} 操作后金额 ${formatCurrency(item.projectedValue)}`,
    );
    lines.push("");
  });

  if (evaluation.recommendations.length === 0) {
    lines.push("当前没有可执行的持仓建议。");
    lines.push("");
  }

  lines.push("汇总");
  lines.push("");
  lines.push(`建议买入合计：${formatCurrency(evaluation.totalBuyValue)}`);
  lines.push(`建议卖出合计：${formatCurrency(evaluation.totalSellValue)}`);
  lines.push(`净调整金额：${formatSignedCurrency(evaluation.netDeltaValue)}`);

  return lines.join("\n");
}
