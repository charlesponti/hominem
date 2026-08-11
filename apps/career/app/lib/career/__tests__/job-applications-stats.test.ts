import { describe, expect, it } from 'vitest';

import {
  computeMonthlyActivity,
  computeSourcePerformance,
  computeStatusBreakdown,
  type JobApplicationCard,
} from '../queries/job-applications';

function makeApplication(overrides: Partial<JobApplicationCard> = {}): JobApplicationCard {
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

describe('job application stats', () => {
  it('returns empty aggregates for no applications', () => {
    expect(computeStatusBreakdown([])).toEqual([]);
    expect(computeSourcePerformance([])).toEqual([]);
    expect(computeMonthlyActivity([])).toEqual([]);
  });

  it('builds status breakdown with percentages', () => {
    const applications = [
      makeApplication({ status: 'active' }),
      makeApplication({ status: 'active' }),
      makeApplication({ status: 'rejected' }),
    ];

    expect(computeStatusBreakdown(applications)).toEqual([
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

    expect(computeSourcePerformance(applications)).toEqual([
      { source: 'linkedin', count: 2, offerCount: 1 },
      { source: 'referral', count: 1, offerCount: 0 },
    ]);
  });

  it('buckets applications by month, oldest to newest', () => {
    const applications = [
      makeApplication({ id: '1', appliedAt: '2025-01-10' }),
      makeApplication({ id: '2', appliedAt: '2025-01-20' }),
      makeApplication({ id: '3', appliedAt: '2025-03-05' }),
    ];

    expect(computeMonthlyActivity(applications)).toEqual([
      { month: '2025-01', count: 2 },
      { month: '2025-03', count: 1 },
    ]);
  });
});
