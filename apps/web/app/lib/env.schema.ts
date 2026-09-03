import { runtimeSchema } from '@hominem/env/runtime';
import { z } from 'zod';

const blankAsUndefined = (value: unknown) => (value === '' ? undefined : value);

export const webSchema = runtimeSchema.extend({
  VITE_PUBLIC_API_URL: z.url(),
  HOMINEM_INTERNAL_API_URL: z.url(),
  PUBLIC_APP_URL: z.url(),
  VITE_POSTHOG_PUBLIC_KEY: z.preprocess(blankAsUndefined, z.string().optional()),
  VITE_POSTHOG_HOST: z.preprocess(
    blankAsUndefined,
    z.url().optional().default('https://us.i.posthog.com'),
  ),
  VITE_OTEL_DISABLED: z.preprocess(
    blankAsUndefined,
    z.enum(['true', 'false']).optional().default('false'),
  ),
  VITE_OTEL_SERVICE_NAME: z.string().optional().default('web'),
  VITE_OTEL_SERVICE_VERSION: z.string().optional().default('0.0.0'),
  VITE_OTEL_DEPLOYMENT_ENVIRONMENT: z.string().optional().default('development'),
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
    blankAsUndefined,
    z
      .union([z.literal('none'), z.url()])
      .optional()
      .default('none'),
  ),
  VITE_OTEL_TRACES_SAMPLER_ARG: z.string().optional().default('1.0'),
});

export const webClientSchema = webSchema.pick({
  VITE_PUBLIC_API_URL: true,
  VITE_POSTHOG_PUBLIC_KEY: true,
  VITE_POSTHOG_HOST: true,
  VITE_OTEL_DISABLED: true,
  VITE_OTEL_SERVICE_NAME: true,
  VITE_OTEL_SERVICE_VERSION: true,
  VITE_OTEL_DEPLOYMENT_ENVIRONMENT: true,
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: true,
  VITE_OTEL_TRACES_SAMPLER_ARG: true,
});

export type WebEnv = z.infer<typeof webSchema>;
export type WebClientEnv = z.infer<typeof webClientSchema>;
