import * as z from 'zod';
import { baseClientSchema, baseServerSchema } from '../base';

/**
 * Notes app client schema - extends base with app-specific variables
 */
export const notesClientSchema = baseClientSchema.extend({
  VITE_APP_BASE_URL: z.string().url(),
  VITE_BETTER_AUTH_URL: z.string().url().optional(),
  VITE_FEATURE_TWITTER_INTEGRATION: z.string().default('false'),
});

export type NotesClientEnv = z.infer<typeof notesClientSchema>;

/**
 * Notes app server schema - extends base with app-specific variables
 */
export const notesServerSchema = baseServerSchema.extend({
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export type NotesServerEnv = z.infer<typeof notesServerSchema>;
