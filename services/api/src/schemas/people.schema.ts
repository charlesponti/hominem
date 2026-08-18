import * as z from 'zod';

const limitSchema = z.number().int().min(1).max(50);

// ── people_lookup ────────────────────────────────────────────────────

const personEmailSchema = z.object({
  email: z.string(),
  isPrimary: z.boolean(),
  source: z.string().nullable(),
});

const personPhoneSchema = z.object({
  phoneNumber: z.string(),
  isPrimary: z.boolean(),
});

const personOrganizationSchema = z.object({
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

export const peopleSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const personPickerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
});

export const peopleSearchOutputSchema = z.object({
  people: z.array(personPickerSchema),
  count: z.number().int().min(0),
});

export const personCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  email: z.email().trim().nullable().optional(),
});

// ── person_timeline ──────────────────────────────────────────────────

export const personTimelineInputSchema = z.object({
  personId: z.string(),
});

const personTimelineCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  startsAt: z.string(),
  role: z.string().nullable(),
});

const personTimelineTripSchema = z.object({
  id: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  role: z.string().nullable(),
});

const personTimelineRelationSchema = z.object({
  relatedPersonId: z.string(),
  relatedDisplayName: z.string().nullable(),
  relation: z.string(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

const personTimelineSocialContactSchema = z.object({
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
