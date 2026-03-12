import { z } from 'zod';

const envSchema = z.object({
  VITE_PUBLIC_API_URL: z.string().url(),
});

export const desktopEnv = envSchema.parse({
  VITE_PUBLIC_API_URL: import.meta.env.VITE_PUBLIC_API_URL,
});
