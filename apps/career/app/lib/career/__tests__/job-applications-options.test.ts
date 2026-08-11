import { describe, expect, it } from 'vitest';

import {
  buildSourceOptions,
  buildStatusOptions,
  NO_SOURCE_FILTER,
  NO_STATUS_FILTER,
} from '../queries/job-applications';

describe('buildStatusOptions', () => {
  it('lists every enum status with a zero count when absent', () => {
    expect(buildStatusOptions([{ status: 'APPLIED', count: 2 }])).toEqual([
      { value: 'WISHLIST', label: 'WISHLIST (0)' },
      { value: 'APPLIED', label: 'APPLIED (2)' },
      { value: 'SCREENING', label: 'SCREENING (0)' },
      { value: 'OFFER', label: 'OFFER (0)' },
      { value: 'ACCEPTED', label: 'ACCEPTED (0)' },
      { value: 'REJECTED', label: 'REJECTED (0)' },
      { value: 'WITHDRAWN', label: 'WITHDRAWN (0)' },
    ]);
  });

  it('keeps enum order regardless of count order', () => {
    expect(
      buildStatusOptions([
        { status: 'REJECTED', count: 3 },
        { status: 'APPLIED', count: 1 },
      ]),
    ).toMatchObject([
      { value: 'WISHLIST' },
      { value: 'APPLIED', label: 'APPLIED (1)' },
      { value: 'SCREENING' },
      { value: 'OFFER' },
      { value: 'ACCEPTED' },
      { value: 'REJECTED', label: 'REJECTED (3)' },
      { value: 'WITHDRAWN' },
    ]);
  });

  it('adds a "No status" option only when null-status rows exist', () => {
    expect(buildStatusOptions([{ status: null, count: 1 }])).toContainEqual({
      value: NO_STATUS_FILTER,
      label: 'No status (1)',
    });
  });

  it('omits the "No status" option when no null-status rows exist', () => {
    const options = buildStatusOptions([{ status: 'APPLIED', count: 1 }]);
    expect(options).not.toContainEqual(expect.objectContaining({ value: NO_STATUS_FILTER }));
  });
});

describe('buildSourceOptions', () => {
  it('sorts sources by count descending', () => {
    expect(
      buildSourceOptions([
        { source: 'referral', count: 1 },
        { source: 'linkedin', count: 5 },
      ]),
    ).toEqual([
      { value: 'linkedin', label: 'linkedin (5)' },
      { value: 'referral', label: 'referral (1)' },
    ]);
  });

  it('adds a "No source" option only when null-source rows exist', () => {
    expect(
      buildSourceOptions([
        { source: 'linkedin', count: 2 },
        { source: null, count: 1 },
      ]),
    ).toEqual([
      { value: 'linkedin', label: 'linkedin (2)' },
      { value: NO_SOURCE_FILTER, label: 'No source (1)' },
    ]);
  });

  it('omits the "No source" option when no null-source rows exist', () => {
    const options = buildSourceOptions([{ source: 'linkedin', count: 2 }]);
    expect(options).not.toContainEqual(expect.objectContaining({ value: NO_SOURCE_FILTER }));
  });

  it('returns an empty list when there are no sources', () => {
    expect(buildSourceOptions([])).toEqual([]);
  });
});
