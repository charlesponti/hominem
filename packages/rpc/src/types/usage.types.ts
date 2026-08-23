export type MonthlyUsageStatus = {
  totalCostUsd: number;
  limitUsd: number;
  remainingUsd: number;
  isOverLimit: boolean;
  periodStart: string;
  periodEnd: string;
};

export type UsageSummary = {
  requestCount: number;
  succeededCount: number;
  failedCount: number;
  usageAvailableCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  lastRecordedAt: string | null;
};

export type UsageFeatureBreakdown = UsageSummaryPick & {
  feature: string;
};

export type UsageModelBreakdown = UsageSummaryPick & {
  model: string | null;
};

type UsageSummaryPick = Omit<UsageSummary, 'lastRecordedAt'>;

export type MonthlyUsageReport = {
  range: { from: string; to: string };
  monthly: MonthlyUsageStatus;
  summary: UsageSummary;
  byFeature: UsageFeatureBreakdown[];
  byModel: UsageModelBreakdown[];
};

export type UsageTimeseriesGranularity = 'day' | 'month';

export type UsageTimeseriesPoint = {
  bucketStart: string;
  model: string | null;
  requestCount: number;
  usageAvailableCount: number;
  totalCostUsd: number;
};

export type UsageTimeseriesReport = {
  range: { from: string; to: string };
  granularity: UsageTimeseriesGranularity;
  points: UsageTimeseriesPoint[];
};
