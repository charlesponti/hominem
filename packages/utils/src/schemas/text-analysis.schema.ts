import * as z from 'zod';

import { DecisionsSchema } from './decision.schema';
import { TextAnalysisEmotionSchema } from './emotion.schema';
import { EventsSchema } from './event.schema';
import { LocationsSchema } from './location.schema';
import { PeopleSchema } from './person.schema';

export const TimestampSchema = z
  .string()
  .describe('Timestamp of the analysis in ISO format, e.g. 2022-01-01T00:00:00Z');

export const ComparisonsSchema = z
  .array(z.array(z.string()))
  .describe(
    'Comparisons between items. Example output: [["item1", "item2", "item3"], ["item4", "item5"]',
  );

export const TextAnalysisSchema = z.object({
  questions: z.array(z.string()).nullable(),
  locations: LocationsSchema.nullable(),
  emotions: z.array(TextAnalysisEmotionSchema).nullable(),
  people: PeopleSchema.nullable(),
  activities: EventsSchema.nullable(),
  decisions: DecisionsSchema.nullable(),
  topics: z.array(z.string()).describe('Topics mentioned in the text'),
  timestamp: TimestampSchema.nullable(),
});

export type TextAnalysis = z.infer<typeof TextAnalysisSchema>;
