import {
  DEFAULT_PORTFOLIO_PATH,
  DEFAULT_STRATEGY_PATH,
  DRY_RUN,
  FORCE_TRIGGER,
} from "./config.js";
import { sendFeishuMarkdown } from "./feishu.js";
import { loadPortfolio, loadStrategy } from "./loaders.js";
import { renderDailyCheckin, renderStrategyAlert } from "./report.js";
import { scrapeMacroData } from "./scraper.js";
import { evaluateStrategy } from "./strategy.js";
import { loadState, saveState } from "./state.js";
import { formatIsoTimestamp } from "./utils.js";

async function main(): Promise<void> {
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
  if (!DRY_RUN && !webhookUrl) {
    throw new Error("缺少 FEISHU_WEBHOOK_URL 环境变量。");
  }

  const [snapshot, portfolio, strategy, state] = await Promise.all([
    scrapeMacroData(),
    loadPortfolio(DEFAULT_PORTFOLIO_PATH),
    loadStrategy(DEFAULT_STRATEGY_PATH),
    loadState(),
  ]);

  const evaluation = evaluateStrategy(portfolio, strategy, snapshot.temperature);
  const shouldTrigger = FORCE_TRIGGER || state.lastTriggeredBandId !== evaluation.band.id;

  const dailyReport = renderDailyCheckin(snapshot, evaluation, shouldTrigger);
  if (DRY_RUN) {
    console.log("=== DAILY CHECKIN ===");
    console.log(dailyReport);
  } else {
    await sendFeishuMarkdown(webhookUrl!, "债券环境打卡", dailyReport);
  }

  if (shouldTrigger) {
    const strategyReport = renderStrategyAlert(snapshot, evaluation);
    if (DRY_RUN) {
      console.log("");
      console.log("=== STRATEGY ALERT ===");
      console.log(strategyReport);
    } else {
      await sendFeishuMarkdown(webhookUrl!, "债券组合调仓建议", strategyReport);
    }
  }

  if (!DRY_RUN) {
    await saveState({
      lastTriggeredBandId: shouldTrigger ? evaluation.band.id : state.lastTriggeredBandId,
      lastObservedTemperature: snapshot.temperature,
      lastObservedYieldRate: snapshot.yieldRate,
      lastRunAt: formatIsoTimestamp(),
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
