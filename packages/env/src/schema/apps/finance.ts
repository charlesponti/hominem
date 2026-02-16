import * as z from 'zod';
import { baseClientSchema, baseServerSchema } from '../base';

/**
 * Finance app client schema - extends base with app-specific variables
 */
export const financeClientSchema = baseClientSchema.extend({
  VITE_APP_BASE_URL: z.string().url(),
  VITE_BETTER_AUTH_URL: z.string().url().optional(),
});

export type FinanceClientEnv = z.infer<typeof financeClientSchema>;

/**
 * Finance app server schema - extends base with app-specific variables
 */
export const financeServerSchema = baseServerSchema.extend({
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
});

export type FinanceServerEnv = z.infer<typeof financeServerSchema>;
