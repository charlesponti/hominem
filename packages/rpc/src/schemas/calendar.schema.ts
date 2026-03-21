import * as z from 'zod'

const EventTypeSchema = z.enum(['meeting', 'reminder', 'birthday', 'holiday', 'other'])

export const CreateEventInputSchema = z.object({
  eventType: EventTypeSchema,
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  startTime: z.string().datetime('Invalid ISO datetime'),
  endTime: z.string().datetime('Invalid ISO datetime').optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
})

export const UpdateEventInputSchema = z.object({
  eventType: EventTypeSchema.optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullish(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional().nullish(),
  allDay: z.boolean().optional(),
  location: z.string().optional().nullish(),
  color: z.string().optional().nullish(),
})

export const AddEventAttendeeInputSchema = z.object({
  personId: z.string().uuid('Invalid person ID'),
})

export const ReplaceEventAttendeesInputSchema = z.object({
  personIds: z.array(z.string().uuid('Invalid person ID')),
})

export const ListEventsFilterSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const GoogleCalendarSyncQuerySchema = z.object({
  calendarId: z.string().min(1, 'calendarId is required'),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
})

export type EventType = z.infer<typeof EventTypeSchema>
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>
export type AddEventAttendeeInput = z.infer<typeof AddEventAttendeeInputSchema>
export type ReplaceEventAttendeesInput = z.infer<typeof ReplaceEventAttendeesInputSchema>
export type ListEventsFilter = z.infer<typeof ListEventsFilterSchema>
export type GoogleCalendarSyncQuery = z.infer<typeof GoogleCalendarSyncQuerySchema>
