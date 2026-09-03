import { z } from 'zod';

export const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENV: z.preprocess(
    (value: unknown) => (value === '' ? undefined : value),
    z.enum(['scripted']).optional(),
  ),
});

export type RuntimeEnv = z.infer<typeof runtimeSchema>;
