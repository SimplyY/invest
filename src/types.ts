export type RiskBucket = "low" | "medium" | "high";
export type PositionRole = "buffer" | "active" | "offensive";
export type Action = "buy" | "sell" | "hold";

export interface PortfolioPosition {
  id: string;
  name: string;
  category: string;
  role: PositionRole;
  baseWeight: number;
  durationYears: number;
  riskBucket: RiskBucket;
  currentValue: number;
  minValue?: number;
  maxValue?: number;
  temperatureTargetWeights?: Record<string, number>;
  enabled?: boolean;
}

export interface StrategyBand {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
  signal: number;
}

export interface LowEntropyRange {
  min: number;
  max: number;
  damping: number;
}

export interface HotZoneConfig {
  thresholdTemperature: number;
  durationThresholdYears: number;
  exponentBase: number;
  temperatureStep: number;
}

export interface StrategyFormula {
  targetTotalValue: number;
  signalScale: number;
  durationScaleYears: number;
  minDurationFactor: number;
  maxDurationFactor: number;
  riskMultipliers: Record<RiskBucket, number>;
  roundingUnit: number;
  lowEntropyRange: LowEntropyRange;
  hotZone: HotZoneConfig;
  coldLiquidityReserve: number;
  activePriorityBoost: number;
  activePriorityTemperature: number;
  activeMinValueById?: Record<string, number>;
}

export interface StrategyConfig {
  bands: StrategyBand[];
  formula: StrategyFormula;
}

export interface ScrapedSnapshot {
  temperature: number;
  yieldRate: number;
  dataDate: string;
  sourceUrl: string;
}

export interface PersistedState {
  lastTriggeredBandId: string | null;
  lastRunAt: string | null;
  lastObservedTemperature: number | null;
  lastObservedYieldRate: number | null;
}

export interface PositionRecommendation {
  positionId: string;
  name: string;
  category: string;
  role: PositionRole;
  durationYears: number;
  riskBucket: RiskBucket;
  currentValue: number;
  currentWeight: number;
  targetWeight: number;
  targetValue: number;
  suggestedDeltaValue: number;
  suggestedDeltaRatio: number;
  projectedValue: number;
  action: Action;
  reason: string;
}

export interface StrategyEvaluationResult {
  band: StrategyBand;
  totalValue: number;
  totalValueBasis: number;
  recommendations: PositionRecommendation[];
  totalBuyValue: number;
  totalSellValue: number;
  netDeltaValue: number;
}
