import { createClientEnv, createServerEnv } from '@hominem/env'
import * as z from 'zod'

const clientSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
  VITE_POSTHOG_API_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().url().optional().default('https://us.i.posthog.com'),
})

const serverSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
  VITE_R2_DOMAIN: z.string().optional(),
  VITE_POSTHOG_API_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().url().optional().default('https://us.i.posthog.com'),
})

void createClientEnv(clientSchema, 'notesClient')
export const serverEnv = createServerEnv(serverSchema, 'notesServer')
