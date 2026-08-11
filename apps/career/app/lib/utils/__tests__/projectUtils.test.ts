import { describe, expect, it } from 'vitest';

import { formatProjectStatus, getProjectStatusTone } from '../projectUtils';

describe('projectUtils', () => {
  it('formats project statuses for display', () => {
    expect(formatProjectStatus('in-progress')).toBe('In Progress');
    expect(formatProjectStatus('backlog')).toBe('Backlog');
  });

  it('returns a status tone for known statuses, case-insensitively', () => {
    expect(getProjectStatusTone('DONE')).toBe('success');
    expect(getProjectStatusTone('in_progress')).toBe('info');
    expect(getProjectStatusTone('CANCELED')).toBe('danger');
    expect(getProjectStatusTone('BACKLOG')).toBe('neutral');
  });

  it('falls back to neutral for unknown statuses', () => {
    expect(getProjectStatusTone('unknown')).toBe('neutral');
  });
});
