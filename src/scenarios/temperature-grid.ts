import { DEFAULT_PORTFOLIO_PATH, DEFAULT_STRATEGY_PATH } from "../config.js";
import { loadPortfolio, loadStrategy } from "../loaders.js";
import { evaluateStrategy } from "../strategy.js";
import type {
  PortfolioPosition,
  PositionRole,
  StrategyEvaluationResult,
} from "../types.js";
import { formatCurrency, formatSignedCurrency } from "../utils.js";
import { pathToFileURL } from "node:url";

export const DEFAULT_TEMPERATURES = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
];

function parseTemperatures(): number[] {
  const raw = process.env.TEMPERATURE_GRID;
  if (!raw) {
    return DEFAULT_TEMPERATURES;
  }

  const values = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  return values.length > 0 ? values : DEFAULT_TEMPERATURES;
}

function getDisplayWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    width += /[^\u0000-\u00ff]/.test(char) ? 2 : 1;
  }
  return width;
}

function padCell(value: string, width: number): string {
  const padding = Math.max(0, width - getDisplayWidth(value));
  return `${value}${" ".repeat(padding)}`;
}

export function buildMarkdownTable(
  headers: string[],
  rows: string[][],
): string {
  const allRows = [headers, ...rows];
  const columnCount = headers.length;
  const widths = Array.from({ length: columnCount }, (_, columnIndex) =>
    Math.max(...allRows.map((row) => getDisplayWidth(row[columnIndex] ?? ""))),
  );

  const renderRow = (row: string[]): string =>
    `| ${row.map((cell, index) => padCell(cell, widths[index] ?? 0)).join(" | ")} |`;

  const separator = `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`;

  return [renderRow(headers), separator, ...rows.map(renderRow)].join("\n");
}

function getRecommendationMap(
  evaluation: StrategyEvaluationResult,
): Map<string, StrategyEvaluationResult["recommendations"][number]> {
  return new Map(
    evaluation.recommendations.map((item) => [item.positionId, item]),
  );
}

function getRoleLabel(role: PositionRole): string {
  switch (role) {
    case "buffer":
      return "缓冲池";
    case "active":
      return "主动债";
    case "offensive":
      return "进攻池";
  }
}

export function renderAmountMatrix(
  portfolio: PortfolioPosition[],
  temperatures: number[],
  evaluations: StrategyEvaluationResult[],
): string {
  const headers = ["基金", ...temperatures.map((temp) => `${temp}°`)];
  const rows = portfolio.map((position) => {
    const cells = evaluations.map((evaluation) => {
      const recommendation = getRecommendationMap(evaluation).get(position.id);
      return recommendation
        ? formatCurrency(recommendation.projectedValue)
        : "-";
    });

    return [`${position.name} (${getRoleLabel(position.role)})`, ...cells];
  });

  return buildMarkdownTable(headers, rows);
}

export function renderDeltaMatrix(
  portfolio: PortfolioPosition[],
  temperatures: number[],
  evaluations: StrategyEvaluationResult[],
): string {
  const headers = ["基金", ...temperatures.map((temp) => `${temp}°`)];
  const rows = portfolio.map((position) => {
    const cells = evaluations.map((evaluation) => {
      const recommendation = getRecommendationMap(evaluation).get(position.id);
      return recommendation
        ? formatSignedCurrency(recommendation.suggestedDeltaValue)
        : "-";
    });

    return [position.name, ...cells];
  });

  return buildMarkdownTable(headers, rows);
}

export function renderPoolMatrix(
  temperatures: number[],
  evaluations: StrategyEvaluationResult[],
): string {
  const headers = ["池子", ...temperatures.map((temp) => `${temp}°`)];
  const rows = [
    {
      label: "缓冲池",
      roles: new Set<PositionRole>(["buffer"]),
    },
    {
      label: "主动债",
      roles: new Set<PositionRole>(["active"]),
    },
    {
      label: "进攻池",
      roles: new Set<PositionRole>(["offensive"]),
    },
  ].map((pool) => {
    const cells = evaluations.map((evaluation) => {
      const total = evaluation.recommendations
        .filter((item) => pool.roles.has(item.role))
        .reduce((sum, item) => sum + item.projectedValue, 0);
      return formatCurrency(total);
    });

    return [pool.label, ...cells];
  });

  return buildMarkdownTable(headers, rows);
}

export function renderBandRow(
  temperatures: number[],
  evaluations: StrategyEvaluationResult[],
): string {
  const headers = ["维度", ...temperatures.map((temp) => `${temp}°`)];
  const rows = [
    ["区间", ...evaluations.map((evaluation) => evaluation.band.label)],
    [
      "总资产基准",
      ...evaluations.map((evaluation) =>
        formatCurrency(evaluation.totalValueBasis),
      ),
    ],
  ];

  return buildMarkdownTable(headers, rows);
}

export async function main(): Promise<void> {
  const temperatures = parseTemperatures();
  const [portfolio, strategy] = await Promise.all([
    loadPortfolio(DEFAULT_PORTFOLIO_PATH),
    loadStrategy(DEFAULT_STRATEGY_PATH),
  ]);

  const evaluations = temperatures.map((temperature) =>
    evaluateStrategy(portfolio, strategy, temperature),
  );

  console.log("=== TEMPERATURE BAND SUMMARY ===");
  console.log(renderBandRow(temperatures, evaluations));
  console.log("");
  console.log("=== PROJECTED VALUE MATRIX ===");
  console.log(renderAmountMatrix(portfolio, temperatures, evaluations));
  console.log("");
  // console.log("=== DELTA MATRIX ===");
  // console.log(renderDeltaMatrix(portfolio, temperatures, evaluations));
  console.log("");
  console.log("=== POOL SUMMARY MATRIX ===");
  console.log(renderPoolMatrix(temperatures, evaluations));
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
