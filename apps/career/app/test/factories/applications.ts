import type { CareerApplicationRecord } from '@hominem/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApplicationOverrides = Partial<CareerApplicationRecord> & Record<string, any>;

export function makeApplication(overrides: ApplicationOverrides = {}): CareerApplicationRecord {
  return {
    id: 'app-1',
    ownerUserid: 'user-1',
    company: 'Acme Corp',
    title: 'Software Engineer',
    location: 'San Francisco, CA',
    source: 'LinkedIn',
    referredBy: null,
    appliedAt: '2024-01-01',
    currentStage: 'interview',
    status: 'applied',
    resumeUrl: null,
    coverLetterUrl: null,
    jobPostingUrl: 'https://example.com/job',
    salaryExpectation: null,
    notes: null,
    legacyId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as CareerApplicationRecord;
}
