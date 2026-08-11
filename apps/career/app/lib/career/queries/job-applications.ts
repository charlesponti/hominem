import { humanizeIdentifier } from '@hominem/utils/text';

import { JOB_APPLICATION_STATUSES } from '~/types/career';

export type FilterOption = { value: string; label: string };

export type JobApplicationCard = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  source: string | null;
  appliedAt: string | null;
  currentStage: string | null;
  status: string | null;
  jobPostingUrl: string | null;
  salaryExpectation: number | null;
  notes: string | null;
  stageCount: number;
  hasOffer: boolean;
};

export type StatusBreakdown = Array<{ status: string; count: number; percentage: number }>;

export type SourcePerformance = Array<{ source: string; count: number; offerCount: number }>;

export type MonthlyActivity = { month: string; count: number };

export const NO_STATUS_FILTER = '__no_status__';
export const NO_SOURCE_FILTER = '__no_source__';

export type StatusCount = { status: string | null; count: number };

export type SourceCount = { source: string | null; count: number };

export function buildStatusOptions(statusCounts: StatusCount[]): FilterOption[] {
  const counts = new Map(statusCounts.map((entry) => [entry.status, entry.count]));
  const noStatus = counts.get(null) ?? 0;
  return [
    ...JOB_APPLICATION_STATUSES.map((status) => ({
      value: status,
      label: `${humanizeIdentifier(status)} (${counts.get(status) ?? 0})`,
    })),
    ...(noStatus > 0 ? [{ value: NO_STATUS_FILTER, label: `No status (${noStatus})` }] : []),
  ];
}

export function buildSourceOptions(sourceCounts: SourceCount[]): FilterOption[] {
  const named = sourceCounts
    .filter((entry): entry is SourceCount & { source: string } => entry.source !== null)
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({ value: entry.source, label: `${entry.source} (${entry.count})` }));
  const noSource = sourceCounts.find((entry) => entry.source === null)?.count ?? 0;
  return noSource > 0
    ? [...named, { value: NO_SOURCE_FILTER, label: `No source (${noSource})` }]
    : named;
}

export type SortDirection = 'asc' | 'desc';

export function computeStatusBreakdown(applications: JobApplicationCard[]): StatusBreakdown {
  const counts = new Map<string, number>();
  for (const app of applications) {
    const key = app.status ?? '(none)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = applications.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count, percentage: (count / total) * 100 }));
}

export function computeSourcePerformance(applications: JobApplicationCard[]): SourcePerformance {
  const map = new Map<string, { count: number; offerCount: number }>();
  for (const app of applications) {
    const source = app.source ?? '(unknown)';
    const current = map.get(source) ?? { count: 0, offerCount: 0 };
    current.count++;
    if (app.hasOffer) current.offerCount++;
    map.set(source, current);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([source, data]) => ({ source, ...data }));
}

export function computeMonthlyActivity(applications: JobApplicationCard[]): MonthlyActivity[] {
  const counts = new Map<string, number>();
  for (const app of applications) {
    if (!app.appliedAt) continue;
    const month = app.appliedAt.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));
}
