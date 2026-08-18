import { z } from 'zod';

import {
  TIME_BLOCK_EXTRACTION_MODEL,
  normalizeOpenRouterError,
  type AIUsageMetrics,
  type OpenRouterClientOptions,
} from './shared';
import {
  createStructuredChatCompletion,
  StructuredOutputError as AITextStructuredOutputError,
} from './text';

const TimeBlockIntent = z.enum([
  'add_task',
  'add_event',
  'add_recurring_event',
  'edit_event',
  'cancel_event',
  'search',
  'schedule_gap_fill',
]);

const RecurrenceRule = z.preprocess(
  (value) => (typeof value === 'string' ? value.replace(/^RRULE:/i, '') : value),
  z.string().trim().max(500).nullable(),
);

const RawTimeBlockSchema = z.object({
  primary_intent: TimeBlockIntent,
  title: z.string().trim().max(200).nullable(),
  target_title: z.string().trim().max(200).nullable(),
  participants: z.array(z.string().trim().min(1).max(120)).max(20).nullable(),
  location: z.string().trim().max(500).nullable(),
  duration: z.number().int().positive().max(1440).nullable(),
  start_time: z.iso.datetime({ offset: true }).nullable(),
  end_time: z.iso.datetime({ offset: true }).nullable(),
  scheduling_window_start: z.iso.datetime({ offset: true }).nullable(),
  scheduling_window_end: z.iso.datetime({ offset: true }).nullable(),
  deadline_fixed: z.iso.date().nullable(),
  recurrence_rule: RecurrenceRule,
});

type TimeBlock = z.infer<typeof RawTimeBlockSchema>;

type TimeBlockExtractionInput = OpenRouterClientOptions & {
  transcript: string;
  referenceDate: string;
  timezone?: string;
  conversationContext?: string;
  calendarContext?: string;
  model?: string;
};

type TimeBlockExtractionResult = {
  block: TimeBlock;
  usage: AIUsageMetrics | null;
};

export function parseTimeBlockExtractionOutput(value: unknown): TimeBlock {
  return RawTimeBlockSchema.parse(value);
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function nextWeekdayDate(referenceDate: string, timezone: string | undefined, weekday: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(referenceDate));
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  if (!year || !month || !day) return null;

  const referenceDay = new Date(Date.UTC(year, month - 1, day));
  const targetDay = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  const delta = (targetDay - referenceDay.getUTCDay() + 7) % 7 || 7;
  const resolved = new Date(referenceDay.getTime() + delta * 24 * 60 * 60 * 1000);
  return resolved.toISOString().slice(0, 10);
}

function replaceIsoDate(value: string | null, date: string | null) {
  return value && date ? value.replace(/^\d{4}-\d{2}-\d{2}/, date) : value;
}

export function normalizeExplicitWeekday(
  block: TimeBlock,
  input: TimeBlockExtractionInput,
): TimeBlock {
  const matches = [
    ...input.transcript
      .toLowerCase()
      .matchAll(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g),
  ];
  const weekday = matches.at(-1)?.[1];
  if (!weekday || (!block.start_time && !block.end_time)) return block;

  const date = nextWeekdayDate(input.referenceDate, input.timezone, weekday);
  if (!date) return block;
  return {
    ...block,
    start_time: replaceIsoDate(block.start_time, date),
    end_time: replaceIsoDate(block.end_time, date),
  };
}

export async function extractTimeBlock(
  input: TimeBlockExtractionInput,
  systemPrompt: string,
): Promise<TimeBlockExtractionResult> {
  const model = input.model ?? TIME_BLOCK_EXTRACTION_MODEL;
  const context = [
    `Current date and time: ${input.referenceDate}`,
    input.timezone ? `Timezone: ${input.timezone}` : null,
    input.conversationContext ? `Conversation context:\n${input.conversationContext}` : null,
    input.calendarContext ? `Calendar context:\n${input.calendarContext}` : null,
    `User input: ${input.transcript}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const { output, usage } = await createStructuredChatCompletion(
      {
        model,
        schema: RawTimeBlockSchema,
        schemaName: 'time_block_extraction',
        schemaDescription: 'A single structured time block extracted from natural language.',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context },
        ],
      },
      input,
    );

    const block = normalizeExplicitWeekday(parseTimeBlockExtractionOutput(output), input);
    return { block, usage };
  } catch (error) {
    if (error instanceof AITextStructuredOutputError) throw error;
    throw normalizeOpenRouterError(error);
  }
}
