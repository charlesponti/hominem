import * as z from 'zod';

import { financeAccountSchema } from './finance.schema';

export const accountListSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export const accountGetSchema = z.object({
  id: z.string().uuid(),
});

const accountCreateBaseSchema = financeAccountSchema.pick({
  name: true,
  type: true,
  balance: true,
  institutionId: true,
});

export const accountCreateSchema = accountCreateBaseSchema.extend({
  balance: accountCreateBaseSchema.shape.balance.optional(),
  institutionId: accountCreateBaseSchema.shape.institutionId.optional(),
  institution: z.string().optional(),
});

export const accountUpdateSchema = financeAccountSchema
  .pick({
    id: true,
    name: true,
    type: true,
    balance: true,
    institutionId: true,
  })
  .extend({
    name: financeAccountSchema.shape.name.optional(),
    type: financeAccountSchema.shape.type.optional(),
    balance: financeAccountSchema.shape.balance.optional(),
    institutionId: financeAccountSchema.shape.institutionId.optional(),
    institution: z.string().optional(),
  });

export const accountDeleteSchema = z.object({
  id: z.string().uuid(),
});

export const institutionAccountsSchema = z.object({
  institutionId: z.string(),
});
