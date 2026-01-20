import { z } from 'zod';

export const EventSchema = z
  .object({
    type: z.string().describe('Type of event'),
    description: z.string().describe('Description of the event'),
    raw: z.string().describe('Raw event content'),
    timestamp: z.string().nullable(),
  })
  .describe('Activity mentioned in the text');

export const EventsSchema = z.array(EventSchema).describe('Activities mentioned in the text');
export type Events = z.infer<typeof EventsSchema>;
