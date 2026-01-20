import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const CONFIG_PATH = path.resolve(os.homedir(), '.hominem');
dotenv.config({ path: path.resolve(CONFIG_PATH, '.env') });

const envSchema = z.object({
  CONFIG_PATH: z.string().default(CONFIG_PATH),
  OPENAI_API_KEY: z.string(),
  API_URL: z.string().default('http://localhost:3000'),
  AUTH_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
