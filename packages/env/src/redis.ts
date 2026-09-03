import { z } from 'zod';

export const redisSchema = z.object({
  REDIS_URL: z.url().default('redis://localhost:6379'),
});

export type RedisEnv = z.infer<typeof redisSchema>;
