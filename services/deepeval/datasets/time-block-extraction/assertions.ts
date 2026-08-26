import { parseModelJson } from '../shared/json-utils';
import type { TimeBlockCase } from './cases';

interface TimeBlock {
  primary_intent?: string;
  title?: string;
  target_title?: string;
  participants?: string[];
  location?: string;
  duration?: number;
  start_time?: string;
  end_time?: string;
  scheduling_window_start?: string;
  scheduling_window_end?: string;
  deadline_fixed?: string | null;
  recurrence_rule?: string;
  [key: string]: unknown;
}

const FIELDS = [
  'primary_intent',
  'title',
  'target_title',
  'participants',
  'location',
  'duration',
  'start_time',
  'end_time',
  'scheduling_window_start',
  'scheduling_window_end',
  'deadline_fixed',
  'recurrence_rule',
] as const;

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(/[|,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalize(value: string): string {
  return String(value).trim().toLowerCase();
}

function sameInstant(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const actualTime = Date.parse(actual);
  const expectedTime = Date.parse(expected);
  return Number.isFinite(actualTime) && actualTime === expectedTime;
}

export default function checkTimeBlock(output: string, testCase: TimeBlockCase): void {
  let block: TimeBlock;
  try {
    block = parseModelJson(output) as unknown as TimeBlock;
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }

  const problems: string[] = [];
  for (const field of FIELDS) {
    if (!(field in block)) problems.push(`Missing required field ${field}`);
  }

  if (testCase.expectedIntent && block.primary_intent !== testCase.expectedIntent) {
    problems.push(
      `Expected intent ${testCase.expectedIntent}, got ${JSON.stringify(block.primary_intent)}`,
    );
  }

  if (testCase.expectedTitlePattern) {
    const pattern = new RegExp(testCase.expectedTitlePattern, 'i');
    if (typeof block.title !== 'string' || !pattern.test(block.title)) {
      problems.push(`Title ${JSON.stringify(block.title)} does not match ${String(pattern)}`);
    }
  }

  if (testCase.expectedTargetTitlePattern) {
    const pattern = new RegExp(testCase.expectedTargetTitlePattern, 'i');
    if (typeof block.target_title !== 'string' || !pattern.test(block.target_title)) {
      problems.push(
        `Target title ${JSON.stringify(block.target_title)} does not match ${String(pattern)}`,
      );
    }
  }

  if (testCase.expectedDuration !== undefined) {
    if (block.duration !== testCase.expectedDuration) {
      problems.push(
        `Expected duration ${testCase.expectedDuration}, got ${JSON.stringify(block.duration)}`,
      );
    }
  }

  if (testCase.expectedStartTime) {
    if (typeof block.start_time !== 'string' || !sameInstant(block.start_time, testCase.expectedStartTime)) {
      problems.push(
        `Expected start_time ${testCase.expectedStartTime}, got ${JSON.stringify(block.start_time)}`,
      );
    }
  }

  if (testCase.expectedEndTime) {
    if (typeof block.end_time !== 'string' || !sameInstant(block.end_time, testCase.expectedEndTime)) {
      problems.push(
        `Expected end_time ${testCase.expectedEndTime}, got ${JSON.stringify(block.end_time)}`,
      );
    }
  }

  if (testCase.expectedDeadline && block.deadline_fixed !== testCase.expectedDeadline) {
    problems.push(
      `Expected deadline_fixed ${testCase.expectedDeadline}, got ${JSON.stringify(block.deadline_fixed)}`,
    );
  }

  if (testCase.expectedRecurrenceRule) {
    const actualRule =
      typeof block.recurrence_rule === 'string'
        ? block.recurrence_rule.replace(/^RRULE:/i, '')
        : block.recurrence_rule;
    if (actualRule !== testCase.expectedRecurrenceRule) {
      problems.push(
        `Expected recurrence_rule ${testCase.expectedRecurrenceRule}, got ${JSON.stringify(block.recurrence_rule)}`,
      );
    }
  }

  if (testCase.expectedWindowStart) {
    if (
      typeof block.scheduling_window_start !== 'string' ||
      !sameInstant(block.scheduling_window_start, testCase.expectedWindowStart)
    ) {
      problems.push(
        `Expected scheduling_window_start ${testCase.expectedWindowStart}, got ${JSON.stringify(block.scheduling_window_start)}`,
      );
    }
  }

  if (testCase.expectedWindowEnd) {
    if (
      typeof block.scheduling_window_end !== 'string' ||
      !sameInstant(block.scheduling_window_end, testCase.expectedWindowEnd)
    ) {
      problems.push(
        `Expected scheduling_window_end ${testCase.expectedWindowEnd}, got ${JSON.stringify(block.scheduling_window_end)}`,
      );
    }
  }

  const expectedParticipants = parseList(testCase.expectedParticipants).map(normalize).sort();
  if (expectedParticipants.length) {
    if (!Array.isArray(block.participants)) {
      problems.push(
        `Expected participants ${expectedParticipants.join(', ')}, got ${JSON.stringify(block.participants)}`,
      );
    } else {
      const actualParticipants = block.participants.map(normalize).sort();
      if (actualParticipants.join('|') !== expectedParticipants.join('|')) {
        problems.push(
          `Expected participants ${expectedParticipants.join(', ')}, got ${actualParticipants.join(', ')}`,
        );
      }
    }
  }

  for (const field of parseList(testCase.nullFields)) {
    if (block[field] !== null) {
      problems.push(`Expected ${field} to be null, got ${JSON.stringify(block[field])}`);
    }
  }

  if (problems.length) {
    throw new Error(problems.join('; '));
  }
}
