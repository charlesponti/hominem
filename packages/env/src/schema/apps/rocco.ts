import * as z from 'zod';
import { baseClientSchema, baseServerSchema } from '../base';

/**
 * Rocco app client schema - extends base with app-specific variables
 */
export const roccoClientSchema = baseClientSchema.extend({
  VITE_APP_BASE_URL: z.string().url(),
  VITE_GOOGLE_API_KEY: z.string().min(1),
  VITE_BETTER_AUTH_URL: z.string().url().optional(),
});

export type RoccoClientEnv = z.infer<typeof roccoClientSchema>;

/**
 * Rocco app server schema - extends base with app-specific variables
 */
export const roccoServerSchema = baseServerSchema.extend({
  GOOGLE_API_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
});

export type RoccoServerEnv = z.infer<typeof roccoServerSchema>;
