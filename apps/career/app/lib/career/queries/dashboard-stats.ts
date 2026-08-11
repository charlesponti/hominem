import type { CareerEngagementRecord, CareerOfferRecord } from '@hominem/db';

import type { JobApplicationCard } from './job-applications';

export type StatusBreakdown = Array<{ status: string; count: number; percentage: number }>;

export type SourcePerformance = Array<{ source: string; count: number; offerCount: number }>;

export type TopCompany = { company: string; count: number; hasOffer: boolean };

export type MonthlyActivity = { month: string; count: number };

export type SalaryPoint = { year: string; averageBaseSalary: number; count: number };

export type DashboardStats = {
  totalApplications: number;
  activeApplications: number;
  rejectedApplications: number;
  offerCount: number;
  offerRate: number;
  employmentPositions: number;
  targetRoles: number;
  statusBreakdown: StatusBreakdown;
  sourcePerformance: SourcePerformance;
  topCompanies: TopCompany[];
  monthlyActivity: MonthlyActivity[];
  salaryHistory: SalaryPoint[];
};

export function computeDashboardStats(
  applications: JobApplicationCard[],
  positions: CareerEngagementRecord[],
  offers: Array<CareerOfferRecord & { appliedAt: string | null }>,
): DashboardStats {
  const totalApplications = applications.length;
  const offerCount = applications.filter((app) => app.hasOffer).length;

  const activeApplications = applications.filter((app) => app.status === 'active').length;
  const rejectedApplications = applications.filter((app) => app.status === 'rejected').length;
  const employmentPositions = positions.length;
  const targetRoles = 0;

  return {
    totalApplications,
    activeApplications,
    rejectedApplications,
    offerCount,
    offerRate: totalApplications > 0 ? (offerCount / totalApplications) * 100 : 0,
    employmentPositions,
    targetRoles,
    statusBreakdown: computeStatusBreakdown(applications),
    sourcePerformance: computeSourcePerformance(applications),
    topCompanies: computeTopCompanies(applications),
    monthlyActivity: computeMonthlyActivity(applications),
    salaryHistory: computeSalaryHistory(offers),
  };
}

function computeStatusBreakdown(applications: JobApplicationCard[]): StatusBreakdown {
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

function computeSourcePerformance(applications: JobApplicationCard[]): SourcePerformance {
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

function computeTopCompanies(applications: JobApplicationCard[]): TopCompany[] {
  const map = new Map<string, { count: number; hasOffer: boolean }>();
  for (const app of applications) {
    const company = app.company || '(unknown)';
    const current = map.get(company) ?? { count: 0, hasOffer: false };
    current.count++;
    if (app.hasOffer) current.hasOffer = true;
    map.set(company, current);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([company, data]) => ({ company, ...data }));
}

function computeMonthlyActivity(applications: JobApplicationCard[]): MonthlyActivity[] {
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

function computeSalaryHistory(
  offers: Array<CareerOfferRecord & { appliedAt: string | null }>,
): SalaryPoint[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const offer of offers) {
    if (offer.baseSalary == null) continue;
    const year = (offer.appliedAt ?? offer.createdAt ?? '').slice(0, 4);
    if (!year) continue;
    const current = map.get(year) ?? { total: 0, count: 0 };
    current.total += offer.baseSalary;
    current.count++;
    map.set(year, current);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, data]) => ({
      year,
      averageBaseSalary: data.total / data.count,
      count: data.count,
    }));
}
