import { z } from 'zod';

const APP_ENVIRONMENTS = ['development', 'e2e', 'production', 'screenshots'] as const;

export const appEnvironmentSchema = z.enum(APP_ENVIRONMENTS);

const omiroEnvironmentSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z
    .string({ error: 'Missing EXPO_PUBLIC_API_BASE_URL.' })
    .trim()
    .min(1, 'Missing EXPO_PUBLIC_API_BASE_URL.')
    .url('EXPO_PUBLIC_API_BASE_URL must be a valid URL.'),
  EXPO_PUBLIC_POSTHOG_API_KEY: z.string().default(''),
  EXPO_PUBLIC_POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),
  EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
});

export function parseAppEnvironment(value: string | undefined) {
  return appEnvironmentSchema.parse(value ?? 'development');
}

export function parseOmiroEnvironment(source: Partial<z.input<typeof omiroEnvironmentSchema>>) {
  return omiroEnvironmentSchema.parse(source);
}

// Expo only inlines EXPO_PUBLIC_* values referenced with static property access.
export const env = parseOmiroEnvironment({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
});
