import { z } from 'zod';

import {
  TASK_EXTRACTION_MODEL,
  normalizeOpenRouterError,
  type OpenRouterClientOptions,
} from './shared';
import {
  createStructuredChatCompletion,
  StructuredOutputError as AITextStructuredOutputError,
} from './text';

export type TaskExtractionInput = OpenRouterClientOptions & {
  transcript: string;
  model?: string;
};

export type ExtractedTask = {
  title: string;
  description?: string;
};

export type TaskExtractionOutput = {
  tasks: ExtractedTask[];
};

export type TaskExtractionResult = {
  tasks: ExtractedTask[];
  usage: import('./shared').AIUsageMetrics | null;
};

// OpenRouter's structured-output mode marks optional fields nullable rather than
// omitting them, so the model returns `description: null` instead of leaving it
// out — accept both and normalize to `undefined` for callers.
const RawTaskExtractionOutputSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().nullable().optional(),
      }),
    )
    .max(10),
});

export function parseTaskExtractionOutput(value: unknown): TaskExtractionOutput {
  const parsed = RawTaskExtractionOutputSchema.parse(value);
  return {
    tasks: parsed.tasks.map((task) => ({
      title: task.title,
      ...(task.description ? { description: task.description } : {}),
    })),
  };
}

export async function extractTasks(
  input: TaskExtractionInput,
  systemPrompt: string,
): Promise<TaskExtractionResult> {
  const model = input.model ?? TASK_EXTRACTION_MODEL;

  try {
    const { output, usage } = await createStructuredChatCompletion(
      {
        model,
        schema: RawTaskExtractionOutputSchema,
        schemaName: 'task_extraction',
        schemaDescription: 'Extracted actionable tasks from free-form transcript text.',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.transcript },
        ],
      },
      input,
    );

    return {
      ...parseTaskExtractionOutput(output),
      usage,
    };
  } catch (error) {
    if (error instanceof AITextStructuredOutputError) {
      throw error;
    }

    throw normalizeOpenRouterError(error);
  }
}

export type VoiceTaskExtractionInput = OpenRouterClientOptions & {
  transcript: string;
  referenceDate: string;
  timezone?: string;
  model?: string;
};

export type ExtractedVoiceTask = {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueAt?: string;
};

export type VoiceTaskExtractionOutput = {
  tasks: ExtractedVoiceTask[];
};

export type VoiceTaskExtractionResult = {
  tasks: ExtractedVoiceTask[];
  usage: import('./shared').AIUsageMetrics | null;
};

// Same nullable-vs-omitted normalization as RawTaskExtractionOutputSchema.
const RawVoiceTaskExtractionSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().nullable().optional(),
        priority: z.enum(['low', 'medium', 'high']).nullable().optional(),
        dueAt: z.string().nullable().optional(),
      }),
    )
    .max(10),
});

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_MIDNIGHT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.000)?)?(?:Z|\+00:00)$/i;

function getTimeZoneOffsetMinutes(date: Date, timezone: string): number | null {
  try {
    const timeZoneName = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;

    if (!timeZoneName) return null;
    if (timeZoneName === 'GMT' || timeZoneName === 'UTC') return 0;

    const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return null;

    const sign = match[1] === '+' ? 1 : -1;
    const hours = Number.parseInt(match[2]!, 10);
    const minutes = Number.parseInt(match[3] ?? '0', 10);
    return sign * (hours * 60 + minutes);
  } catch {
    return null;
  }
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (absoluteMinutes % 60).toString().padStart(2, '0');
  return `${sign}${hours}:${remainder}`;
}

function formatDateInTimezone(date: Date, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const lookup = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;

    const year = lookup('year');
    const month = lookup('month');
    const day = lookup('day');
    const hour = lookup('hour');
    const minute = lookup('minute');
    const second = lookup('second');

    if (!(year && month && day && hour && minute && second)) {
      return null;
    }

    const offsetMinutes = getTimeZoneOffsetMinutes(date, timezone);
    if (offsetMinutes === null) {
      return null;
    }

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${formatOffset(offsetMinutes)}`;
  } catch {
    return null;
  }
}

function buildUtcIsoForLocalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): string | null {
  const utcGuessMillis = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const initialOffsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuessMillis), timezone);
  if (initialOffsetMinutes === null) {
    return null;
  }

  const correctedMillis = utcGuessMillis - initialOffsetMinutes * 60_000;
  const correctedOffsetMinutes = getTimeZoneOffsetMinutes(new Date(correctedMillis), timezone);
  if (correctedOffsetMinutes === null) {
    return null;
  }

  return new Date(utcGuessMillis - correctedOffsetMinutes * 60_000).toISOString();
}

export function formatVoiceTaskReferenceDate(referenceDate: string, timezone?: string): string {
  if (!timezone) {
    return referenceDate;
  }

  const parsedDate = new Date(referenceDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return referenceDate;
  }

  return formatDateInTimezone(parsedDate, timezone) ?? referenceDate;
}

export function normalizeVoiceTaskDueAt(dueAt: string, timezone?: string): string {
  if (!timezone) {
    return dueAt;
  }

  const dateOnlyMatch = dueAt.match(DATE_ONLY_PATTERN);
  const utcMidnightMatch = dueAt.match(UTC_MIDNIGHT_PATTERN);
  const normalizedMatch = dateOnlyMatch ?? utcMidnightMatch;

  if (!normalizedMatch) {
    return dueAt;
  }

  const year = Number.parseInt(normalizedMatch[1]!, 10);
  const month = Number.parseInt(normalizedMatch[2]!, 10);
  const day = Number.parseInt(normalizedMatch[3]!, 10);

  return buildUtcIsoForLocalTime(year, month, day, 12, 0, 0, timezone) ?? dueAt;
}

export function parseVoiceTaskExtractionOutput(
  value: unknown,
  timezone?: string,
): VoiceTaskExtractionOutput {
  const parsed = RawVoiceTaskExtractionSchema.parse(value);
  return {
    tasks: parsed.tasks.map((task) => ({
      title: task.title,
      ...(task.description ? { description: task.description } : {}),
      ...(task.priority ? { priority: task.priority } : {}),
      ...(task.dueAt ? { dueAt: normalizeVoiceTaskDueAt(task.dueAt, timezone) } : {}),
    })),
  };
}

export async function extractVoiceTasks(
  input: VoiceTaskExtractionInput,
  systemPrompt: string,
): Promise<VoiceTaskExtractionResult> {
  const model = input.model ?? TASK_EXTRACTION_MODEL;

  const contextHeader = `Reference date/time: ${formatVoiceTaskReferenceDate(
    input.referenceDate,
    input.timezone,
  )}${input.timezone ? ` (timezone: ${input.timezone})` : ''}`;

  try {
    const { output, usage } = await createStructuredChatCompletion(
      {
        model,
        schema: RawVoiceTaskExtractionSchema,
        schemaName: 'voice_task_extraction',
        schemaDescription:
          'Extracted tasks with optional priority and due date from a voice transcript.',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${contextHeader}\n\n${input.transcript}` },
        ],
      },
      input,
    );

    return {
      ...parseVoiceTaskExtractionOutput(output, input.timezone),
      usage,
    };
  } catch (error) {
    if (error instanceof AITextStructuredOutputError) {
      throw error;
    }

    throw normalizeOpenRouterError(error);
  }
}
