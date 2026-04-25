import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadPortfolio, loadStrategy } from "../src/loaders.js";
import { loadState } from "../src/state.js";

const envKeys = ["PORTFOLIO_JSON", "STRATEGY_JSON", "STATE_JSON"] as const;
const baselineEnv = new Map<string, string | undefined>(
  envKeys.map((key) => [key, process.env[key]]),
);

afterEach(async () => {
  for (const key of envKeys) {
    const value = baselineEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("runtime config injection", () => {
  it("prefers PORTFOLIO_JSON over the local file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "invest-portfolio-"));
    const tempFile = path.join(tempDir, "portfolio.json");
    await writeFile(tempFile, "[]\n", "utf8");
    process.env.PORTFOLIO_JSON = JSON.stringify([
      {
        id: "buffer-a",
        name: "缓冲债A",
        category: "超短债",
        role: "buffer",
        baseWeight: 1,
        durationYears: 0.5,
        riskBucket: "low",
        currentValue: 100000,
      },
    ]);

    const portfolio = await loadPortfolio(tempFile);
    expect(portfolio).toHaveLength(1);
    expect(portfolio[0]?.id).toBe("buffer-a");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("prefers STRATEGY_JSON over the local file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "invest-strategy-"));
    const tempFile = path.join(tempDir, "strategy.json");
    await writeFile(tempFile, "{}\n", "utf8");
    process.env.STRATEGY_JSON = JSON.stringify({
      bands: [{ id: "cold", label: "0-10", min: 0, max: 10, signal: 0.5 }],
      formula: {
        targetTotalValue: 600000,
        signalScale: 0.1,
        durationScaleYears: 6,
        minDurationFactor: 0.3,
        maxDurationFactor: 2.2,
        riskMultipliers: { low: 0.8, medium: 1, high: 1.2 },
        roundingUnit: 100,
        lowEntropyRange: { min: 30, max: 50, damping: 0.2 },
        hotZone: {
          thresholdTemperature: 80,
          durationThresholdYears: 3,
          exponentBase: 1.8,
          temperatureStep: 5,
        },
        coldLiquidityReserve: 200000,
        activePriorityBoost: 1.2,
        activePriorityTemperature: 20,
      },
    });

    const strategy = await loadStrategy(tempFile);
    expect(strategy.bands[0]?.id).toBe("cold");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("prefers STATE_JSON over the local state file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "invest-state-"));
    const tempFile = path.join(tempDir, "state.json");
    await writeFile(
      tempFile,
      JSON.stringify({ lastObservedTemperature: 10, lastTriggeredBandId: "local" }),
      "utf8",
    );
    process.env.STATE_JSON = JSON.stringify({
      lastObservedTemperature: 79,
      lastTriggeredBandId: "env",
      lastRunAt: null,
      lastObservedYieldRate: 1.76,
    });

    const state = await loadState(tempFile);
    expect(state.lastObservedTemperature).toBe(79);
    expect(state.lastTriggeredBandId).toBe("env");

    await rm(tempDir, { recursive: true, force: true });
  });
});
