import { describe, expect, it } from 'vitest';

import { createTimePreviewScenarios } from '~/components/time/time-preview-scenarios';

describe('Time preview scenarios', () => {
  it('provides one fresh four-week Busy fixture with events and tasks', () => {
    const scenarios = createTimePreviewScenarios();
    const busy = scenarios.find((scenario) => scenario.id === 'busy');

    expect(scenarios.map((scenario) => scenario.id)).toEqual(['busy', 'empty']);
    expect(busy).toBeDefined();
    expect(busy?.events).toHaveLength(122);
    expect(busy?.tasks).toHaveLength(58);

    const eventStarts = busy?.events.map((event) => new Date(event.startDate).getTime()) ?? [];
    expect(Math.max(...eventStarts) - Math.min(...eventStarts)).toBeGreaterThan(
      27 * 24 * 60 * 60 * 1000,
    );
    expect(busy?.events.filter((event) => event.isAllDay)).not.toHaveLength(0);
    expect(busy?.tasks.some((task) => task.scheduledStartAt !== null)).toBe(true);
    expect(busy?.tasks.some((task) => !task.scheduledStartAt && !task.dueAt)).toBe(true);
  });
});
