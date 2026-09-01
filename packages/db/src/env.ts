import { createServerEnv } from '@hominem/env';
import { baseSchema } from '@hominem/env/base';
import 'dotenv/config';
import { z } from 'zod';

const dbSchema = baseSchema.extend({
  DATABASE_URL: z.url(),
});

export const env = createServerEnv(dbSchema, 'db');
