import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimeRoot = path.resolve(__dirname, "..");
const projectRoot =
  path.basename(runtimeRoot) === "dist" ? path.dirname(runtimeRoot) : runtimeRoot;

function resolveEnvPath(envValue: string | undefined, fallbackPath: string): string {
  if (!envValue) {
    return fallbackPath;
  }

  return path.isAbsolute(envValue) ? envValue : path.resolve(projectRoot, envValue);
}

function isEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const DATA_PAGE_URL = "https://youzhiyouxing.cn/data";
export const DEFAULT_PORTFOLIO_PATH = resolveEnvPath(
  process.env.PORTFOLIO_PATH,
  path.join(projectRoot, "data", "portfolio.json"),
);
export const DEFAULT_STRATEGY_PATH = resolveEnvPath(
  process.env.STRATEGY_PATH,
  path.join(projectRoot, "data", "strategy.json"),
);
export const PORTFOLIO_EXAMPLE_PATH = path.join(projectRoot, "data", "portfolio.example.json");
export const STRATEGY_EXAMPLE_PATH = path.join(projectRoot, "data", "strategy.example.json");
export const STATE_PATH = resolveEnvPath(process.env.STATE_PATH, path.join(projectRoot, "state.json"));
export const USER_AGENT =
  "investment-bond-agent/1.0 (+https://github.com/actions; automated monitoring)";
export const DRY_RUN = isEnabled(process.env.DRY_RUN);
export const FORCE_TRIGGER = isEnabled(process.env.FORCE_TRIGGER);
