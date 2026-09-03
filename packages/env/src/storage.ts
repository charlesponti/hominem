import { z } from 'zod';

export const storageSchema = z.object({
  R2_ENDPOINT: z.url().default('http://localhost:9000'),
  R2_BUCKET_NAME: z.string().min(1).default('storage'),
  R2_ACCESS_KEY_ID: z.string().min(1).default('minioadmin'),
  R2_SECRET_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  R2_PUBLIC_URL: z.url().default('http://localhost:9000'),
});

export type StorageEnv = z.infer<typeof storageSchema>;
