import * as z from 'zod';

const limitSchema = z.number().int().min(1).max(50);

// ── people_lookup ────────────────────────────────────────────────────

export const personEmailSchema = z.object({
  email: z.string(),
  isPrimary: z.boolean(),
  source: z.string().nullable(),
});

export const personPhoneSchema = z.object({
  phoneNumber: z.string(),
  isPrimary: z.boolean(),
});

export const personOrganizationSchema = z.object({
  organization: z.string(),
  isPrimary: z.boolean(),
  source: z.string().nullable(),
});

export const personSummarySchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  personType: z.string().nullable(),
  notes: z.string().nullable(),
  emails: z.array(personEmailSchema),
  phones: z.array(personPhoneSchema),
  organizations: z.array(personOrganizationSchema),
  tags: z.array(z.string()),
});

export const peopleLookupInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: limitSchema.default(10),
});

export const peopleLookupOutputSchema = z.object({
  people: z.array(personSummarySchema),
  count: z.number().int().min(0),
});

// ── person_timeline ──────────────────────────────────────────────────

export const personTimelineInputSchema = z.object({
  personId: z.string(),
});

export const personTimelineCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  startsAt: z.string(),
  role: z.string().nullable(),
});

export const personTimelineTripSchema = z.object({
  id: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  role: z.string().nullable(),
});

export const personTimelineRelationSchema = z.object({
  relatedPersonId: z.string(),
  relatedDisplayName: z.string().nullable(),
  relation: z.string(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

export const personTimelineSocialContactSchema = z.object({
  platform: z.string(),
  displayName: z.string().nullable(),
  kind: z.string().nullable(),
  isMutual: z.boolean(),
});

export const personTimelineOutputSchema = z.object({
  person: personSummarySchema.nullable(),
  calendarEvents: z.array(personTimelineCalendarEventSchema),
  trips: z.array(personTimelineTripSchema),
  relations: z.array(personTimelineRelationSchema),
  socialContacts: z.array(personTimelineSocialContactSchema),
});
