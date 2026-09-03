import { z } from 'zod';

export const databaseSchema = z.object({
  DATABASE_URL: z.url().optional(),
  DB_MAX_CONNECTIONS: z.coerce.number().int().positive().optional(),
  DB_IDLE_TIMEOUT: z.coerce.number().int().positive().optional(),
  DB_MAX_LIFETIME: z.coerce.number().int().positive().optional(),
});

export type DatabaseEnv = z.infer<typeof databaseSchema>;
