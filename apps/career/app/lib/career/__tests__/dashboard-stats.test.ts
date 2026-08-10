import type { CareerPositionRecord } from '@hominem/db';
import { describe, expect, it } from 'vitest';

import { computeDashboardStats } from '../queries/dashboard-stats';

function makeApplication(
  overrides: Partial<Parameters<typeof computeDashboardStats>[0][number]> = {},
) {
  return {
    id: 'app-1',
    company: 'Acme',
    title: 'Engineer',
    location: null,
    source: 'linkedin',
    appliedAt: '2025-01-15',
    currentStage: null,
    status: 'active',
    jobPostingUrl: null,
    salaryExpectation: null,
    notes: null,
    stageCount: 1,
    hasOffer: false,
    ...overrides,
  };
}

function makePosition(overrides: Partial<CareerPositionRecord> = {}): CareerPositionRecord {
  return {
    id: 'pos-1',
    company: 'Acme',
    title: 'Engineer',
    address: null,
    contactName: null,
    contactPhone: null,
    createdAt: '2025-01-01',
    currency: 'USD',
    description: null,
    endDate: null,
    isCurrent: false,
    isTarget: false,
    location: null,
    ownerUserid: 'user-1',
    projectStatus: null,
    recordType: 'employment',
    salaryHigh: null,
    salaryLow: null,
    source: null,
    startDate: null,
    updatedAt: '2025-01-01',
    url: null,
    ...overrides,
  };
}

describe('computeDashboardStats', () => {
  it('returns zeros for empty data', () => {
    const stats = computeDashboardStats([], [], []);
    expect(stats.totalApplications).toBe(0);
    expect(stats.activeApplications).toBe(0);
    expect(stats.rejectedApplications).toBe(0);
    expect(stats.offerCount).toBe(0);
    expect(stats.offerRate).toBe(0);
    expect(stats.employmentPositions).toBe(0);
    expect(stats.targetRoles).toBe(0);
    expect(stats.statusBreakdown).toEqual([]);
    expect(stats.sourcePerformance).toEqual([]);
    expect(stats.topCompanies).toEqual([]);
    expect(stats.monthlyActivity).toEqual([]);
    expect(stats.salaryHistory).toEqual([]);
  });

  it('counts active, rejected, and offer applications', () => {
    const applications = [
      makeApplication({ id: 'a', status: 'active' }),
      makeApplication({ id: 'b', status: 'active', hasOffer: true }),
      makeApplication({ id: 'c', status: 'rejected' }),
      makeApplication({ id: 'd', status: 'withdrew' }),
    ];
    const stats = computeDashboardStats(applications, [], []);

    expect(stats.totalApplications).toBe(4);
    expect(stats.activeApplications).toBe(2);
    expect(stats.rejectedApplications).toBe(1);
    expect(stats.offerCount).toBe(1);
    expect(stats.offerRate).toBe(25);
  });

  it('separates employment positions from target roles', () => {
    const positions = [
      makePosition({ id: 'emp', isTarget: false }),
      makePosition({ id: 'target', isTarget: true }),
    ];
    const stats = computeDashboardStats([], positions, []);

    expect(stats.employmentPositions).toBe(1);
    expect(stats.targetRoles).toBe(1);
  });

  it('builds status breakdown with percentages', () => {
    const applications = [
      makeApplication({ status: 'active' }),
      makeApplication({ status: 'active' }),
      makeApplication({ status: 'rejected' }),
    ];
    const stats = computeDashboardStats(applications, [], []);

    expect(stats.statusBreakdown).toEqual([
      { status: 'active', count: 2, percentage: 66.66666666666666 },
      { status: 'rejected', count: 1, percentage: 33.33333333333333 },
    ]);
  });

  it('groups sources by count and offer presence', () => {
    const applications = [
      makeApplication({ source: 'linkedin' }),
      makeApplication({ source: 'linkedin', hasOffer: true }),
      makeApplication({ source: 'referral' }),
    ];
    const stats = computeDashboardStats(applications, [], []);

    expect(stats.sourcePerformance).toEqual([
      { source: 'linkedin', count: 2, offerCount: 1 },
      { source: 'referral', count: 1, offerCount: 0 },
    ]);
  });

  it('ranks top companies by application count', () => {
    const applications = [
      makeApplication({ id: '1', company: 'Acme' }),
      makeApplication({ id: '2', company: 'Acme' }),
      makeApplication({ id: '3', company: 'Globex' }),
      makeApplication({ id: '4', company: 'Globex' }),
      makeApplication({ id: '5', company: 'Globex', hasOffer: true }),
      makeApplication({ id: '6', company: 'Initech' }),
    ];
    const stats = computeDashboardStats(applications, [], []);

    expect(stats.topCompanies[0]).toEqual({ company: 'Globex', count: 3, hasOffer: true });
    expect(stats.topCompanies[1]).toEqual({ company: 'Acme', count: 2, hasOffer: false });
  });

  it('buckets applications by month, oldest to newest', () => {
    const applications = [
      makeApplication({ id: '1', appliedAt: '2025-01-10' }),
      makeApplication({ id: '2', appliedAt: '2025-01-20' }),
      makeApplication({ id: '3', appliedAt: '2025-03-05' }),
    ];
    const stats = computeDashboardStats(applications, [], []);

    expect(stats.monthlyActivity).toEqual([
      { month: '2025-01', count: 2 },
      { month: '2025-03', count: 1 },
    ]);
  });

  it('computes average base salary per year from offers', () => {
    const offers = [
      {
        id: 'o1',
        applicationId: 'a',
        baseSalary: 150_000_00,
        bonus: null,
        currency: 'USD',
        decision: null,
        decisionAt: null,
        equity: null,
        notes: null,
        signingBonus: null,
        totalComp: null,
        createdAt: '2025-02-01',
        company: 'Acme',
        title: 'Engineer',
        appliedAt: '2025-01-15',
      },
      {
        id: 'o2',
        applicationId: 'b',
        baseSalary: 170_000_00,
        bonus: null,
        currency: 'USD',
        decision: null,
        decisionAt: null,
        equity: null,
        notes: null,
        signingBonus: null,
        totalComp: null,
        createdAt: '2025-03-01',
        company: 'Globex',
        title: 'Engineer',
        appliedAt: '2025-02-20',
      },
    ];
    const stats = computeDashboardStats([], [], offers);

    expect(stats.salaryHistory).toEqual([
      { year: '2025', averageBaseSalary: 160_000_00, count: 2 },
    ]);
  });
});
