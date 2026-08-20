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

  it('accepts timezone-offset timestamps from time block extraction', () => {
    const result = CreateTaskSchema.parse({
      artifactType: 'task',
      title: 'Write pitch deck',
      schedulingWindowStartAt: '2026-07-29T08:00:00-07:00',
      schedulingWindowEndAt: '2026-07-29T18:00:00-07:00',
    });

    expect(result.schedulingWindowStartAt).toBe('2026-07-29T08:00:00-07:00');
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
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
      ],
    });

    expect(result.participants).toHaveLength(2);
    expect(result.participants?.[1]).toBe('00000000-0000-4000-8000-000000000002');
  });

  it('accepts timezone-offset timestamps when updating a task', () => {
    const result = UpdateTaskSchema.parse({
      schedulingWindowStartAt: '2026-07-29T08:00:00-07:00',
      schedulingWindowEndAt: '2026-07-29T18:00:00-07:00',
    });

    expect(result.schedulingWindowEndAt).toBe('2026-07-29T18:00:00-07:00');
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
