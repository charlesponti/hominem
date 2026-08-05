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
