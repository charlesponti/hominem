import * as z from 'zod';

/**
 * Base client schema - variables available in browser via import.meta.env
 * These MUST have VITE_ prefix to be exposed by Vite
 */
export const baseClientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

export type BaseClientEnv = z.infer<typeof baseClientSchema>;

/**
 * Base server schema - variables available in Node.js via process.env
 * These should NOT have VITE_ prefix (server-only)
 */
export const baseServerSchema = z.object({
  PUBLIC_API_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  
  // Server configuration
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API Keys (server-only)
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Plaid (server-only)
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_API_KEY: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_SECRET: z.string().optional(),
  
  // OAuth (server-only)
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  
  // Email (server-only)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_FROM_NAME: z.string().optional(),
  
  // App URLs for CORS
  ROCCO_URL: z.string().url().optional(),
  NOTES_URL: z.string().url().optional(),
  FLORIN_URL: z.string().url().optional(),
});

export type BaseServerEnv = z.infer<typeof baseServerSchema>;
