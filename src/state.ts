import { readFile, writeFile } from "node:fs/promises";
import { STATE_PATH } from "./config.js";
import type { PersistedState } from "./types.js";
import { formatIsoTimestamp } from "./utils.js";

const defaultState: PersistedState = {
  lastTriggeredBandId: null,
  lastRunAt: null,
  lastObservedTemperature: null,
  lastObservedYieldRate: null,
};

function parseStateJson(content: string, label: string): PersistedState {
  try {
    const parsed = JSON.parse(content) as Partial<PersistedState>;
    return {
      ...defaultState,
      ...parsed,
    };
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON: ${(error as Error).message}`);
  }
}

export async function loadState(statePath = STATE_PATH): Promise<PersistedState> {
  if (process.env.STATE_JSON && process.env.STATE_JSON.trim() !== "") {
    return parseStateJson(process.env.STATE_JSON, "STATE_JSON");
  }

  try {
    const raw = await readFile(statePath, "utf8");
    return parseStateJson(raw, statePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { ...defaultState };
    }

    throw error;
  }
}

export async function saveState(
  partialState: Partial<PersistedState>,
  statePath = STATE_PATH,
): Promise<void> {
  const nextState: PersistedState = {
    ...(await loadState(statePath)),
    ...partialState,
    lastRunAt: partialState.lastRunAt ?? formatIsoTimestamp(),
  };

  await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
}
