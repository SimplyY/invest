import type {
  Action,
  PositionRecommendation,
  ScrapedSnapshot,
  StrategyEvaluationResult,
} from "./types.js";
import {
  displayWidth,
  formatCurrency,
  formatSignedCurrency,
  padToDisplayWidth,
  truncateToDisplayWidth,
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

const actionLabel: Record<Action, string> = {
  buy: "买入",
  sell: "卖出",
  hold: "持有",
};

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "｜").replace(/\r?\n/g, " ");
}

/** 管理人前缀 + 久期/品类标签（与 portfolio 命名习惯一致）。 */
const FUND_CATEGORY_RULES: Array<{ re: RegExp; tag: string }> = [
  { re: /7[-－]10/, tag: "7-10年" },
  { re: /3[-－]5年/, tag: "3-5年" },
  { re: /1[-－]3年/, tag: "1-3年" },
  { re: /超短债/, tag: "超短债" },
  { re: /中短债/, tag: "中短债" },
];

function abbreviateFundName(full: string, category: string): string {
  for (const { re, tag } of FUND_CATEGORY_RULES) {
    const m = full.match(re);
    if (!m || m.index === undefined) {
      continue;
    }
    const idx = m.index;
    const brand = full
      .slice(0, idx)
      .replace(/[a-zA-Z0-9\s]+$/u, "")
      .trimEnd();
    const prefix = [...brand][0] ?? brand;
    return `${prefix}·${tag}`;
  }
  const first = [...full][0];
  const cat = category.trim();
  if (cat.length > 0) {
    return `${first ?? full}·${cat}`;
  }
  return first ?? full;
}

const MAX_FUND_NAME_DISPLAY_WIDTH = 22;
const IDX_COL_DISPLAY_WIDTH = 2;

/** 表格金额：≥1 万用「万」；不足 1 万用「千」整数（四舍五入），整千为 0 时退回千分位数字。 */
function formatTableMoney(value: number): string {
  if (value === 0) {
    return "0";
  }
  const abs = Math.abs(value);
  if (abs >= 10000) {
    return formatCurrency(value);
  }
  const qian = Math.round(value / 1000);
  if (qian === 0) {
    return abs.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return `${qian}千`;
}

function formatSignedTableMoney(value: number): string {
  if (value === 0) {
    return "0";
  }
  const abs = Math.abs(value);
  if (abs >= 10000) {
    return formatSignedCurrency(value);
  }
  const qian = Math.round(value / 1000);
  if (qian === 0) {
    const raw = abs.toLocaleString("zh-CN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return value > 0 ? `+${raw}` : `-${raw}`;
  }
  if (qian > 0) {
    return `+${qian}千`;
  }
  return `${qian}千`;
}

function buildRecommendationsTableLines(recommendations: PositionRecommendation[]): string[] {
  type Row = { idx: string; name: string; dir: string; cur: string; op: string; after: string };
  const rows: Row[] = recommendations.map((item, index) => {
    const abbreviated = abbreviateFundName(item.name, item.category);
    return {
      idx: String(index + 1),
      name: escapeTableCell(abbreviated),
      dir: actionLabel[item.action],
      cur: formatTableMoney(item.currentValue),
      op: formatSignedTableMoney(item.suggestedDeltaValue),
      after: formatTableMoney(item.projectedValue),
    };
  });

  const header: Row = {
    idx: "#",
    name: "基金",
    dir: "方向",
    cur: "当前",
    op: "操作",
    after: "操作后",
  };

  const keys = ["idx", "name", "dir", "cur", "op", "after"] as const;
  const aligns: Array<"left" | "right"> = ["right", "left", "left", "right", "right", "right"];

  const widths = keys.map((key) => {
    if (key === "idx") {
      return IDX_COL_DISPLAY_WIDTH;
    }
    const headerW = displayWidth(header[key]);
    const dataMax = Math.max(...rows.map((r) => displayWidth(r[key])));
    let w = Math.max(3, headerW, dataMax);
    if (key === "name") {
      w = Math.min(w, MAX_FUND_NAME_DISPLAY_WIDTH);
    }
    return w;
  });

  const nameColWidth = widths[1] ?? MAX_FUND_NAME_DISPLAY_WIDTH;
  for (const row of rows) {
    if (displayWidth(row.name) > nameColWidth) {
      row.name = truncateToDisplayWidth(row.name, nameColWidth);
    }
  }

  const fmtRow = (row: Row) =>
    `| ${keys
      .map((key, j) => {
        const colWidth = widths[j] ?? 3;
        const align = aligns[j] ?? "left";
        return padToDisplayWidth(row[key], colWidth, align);
      })
      .join(" | ")} |`;

  const sep = `| ${widths.map((w) => "-".repeat(w ?? 3)).join(" | ")} |`;

  return [fmtRow(header), sep, ...rows.map(fmtRow)];
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

  if (evaluation.recommendations.length === 0) {
    lines.push("当前没有可执行的持仓建议。");
    lines.push("");
  } else {
    lines.push(...buildRecommendationsTableLines(evaluation.recommendations));
    lines.push("");
  }

  lines.push("汇总");
  lines.push("");
  lines.push(`建议买入合计：${formatCurrency(evaluation.totalBuyValue)}`);
  lines.push(`建议卖出合计：${formatCurrency(evaluation.totalSellValue)}`);
  lines.push(`净调整金额：${formatSignedCurrency(evaluation.netDeltaValue)}`);

  return lines.join("\n");
}
