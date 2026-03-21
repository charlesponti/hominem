import * as z from 'zod';

export const accountListSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export const accountGetSchema = z.object({
  id: z.string().uuid(),
});

export const accountCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  balance: z.union([z.number(), z.string()]).optional(),
  institutionId: z.string().optional(),
  institution: z.string().optional(),
});

export const accountUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  balance: z.union([z.number(), z.string()]).optional(),
  institutionId: z.string().optional(),
  institution: z.string().optional(),
});

export const accountDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const institutionAccountsSchema = z.object({
  institutionId: z.string(),
});
