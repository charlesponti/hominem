import { createClientEnv, createServerEnv } from '@hominem/env';
import { object, string } from 'zod';

const clientSchema = object({
  VITE_PUBLIC_API_URL: string().url(),
  VITE_R2_DOMAIN: string().optional(),
  VITE_POSTHOG_API_KEY: string().optional(),
  VITE_POSTHOG_HOST: string().url().optional().default('https://us.i.posthog.com'),
});

const serverSchema = object({
  VITE_PUBLIC_API_URL: string().url(),
  VITE_R2_DOMAIN: string().optional(),
  VITE_POSTHOG_API_KEY: string().optional(),
  VITE_POSTHOG_HOST: string().url().optional().default('https://us.i.posthog.com'),
});

void createClientEnv(clientSchema, 'notesClient');
export const serverEnv = createServerEnv(serverSchema, 'notesServer');
