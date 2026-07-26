import { describe, expect, it } from 'vitest';

import { CreateTaskSchema, UpdateTaskSchema } from './tasks.schema';

describe('task time fields', () => {
  it('accepts a flexible task with a duration and scheduling window', () => {
    const result = CreateTaskSchema.parse({
      artifactType: 'task',
      title: 'Write pitch deck',
      durationMinutes: 120,
      schedulingWindowStartAt: '2026-07-29T15:00:00.000Z',
      schedulingWindowEndAt: '2026-07-30T01:00:00.000Z',
      timeZone: 'America/Los_Angeles',
    });

    expect(result.durationMinutes).toBe(120);
    expect(result.scheduledStartAt).toBeUndefined();
  });

  it('accepts a fixed task when both scheduled timestamps are present', () => {
    const result = CreateTaskSchema.parse({
      artifactType: 'task',
      title: 'Meeting with Sarah',
      scheduledStartAt: '2026-07-28T17:00:00.000Z',
      scheduledEndAt: '2026-07-28T18:00:00.000Z',
    });

    expect(result.scheduledEndAt).toBe('2026-07-28T18:00:00.000Z');
  });

  it('accepts a replacement list of task participants', () => {
    const result = UpdateTaskSchema.parse({
      participants: [
        { displayName: 'Maya Chen', email: 'maya@example.com' },
        { displayName: 'Alex Rivera' },
      ],
    });

    expect(result.participants).toHaveLength(2);
    expect(result.participants?.[1]?.email).toBeUndefined();
  });

  it('rejects a partial or reversed scheduled interval', () => {
    expect(() =>
      CreateTaskSchema.parse({
        artifactType: 'task',
        title: 'Partial block',
        scheduledStartAt: '2026-07-28T17:00:00.000Z',
      }),
    ).toThrow();

    expect(() =>
      UpdateTaskSchema.parse({
        scheduledStartAt: '2026-07-28T18:00:00.000Z',
        scheduledEndAt: '2026-07-28T17:00:00.000Z',
      }),
    ).toThrow();
  });
});
