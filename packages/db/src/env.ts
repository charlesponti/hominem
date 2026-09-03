import { createServerEnv } from '@hominem/env';
import { databaseSchema } from '@hominem/env/database';
import { runtimeSchema } from '@hominem/env/runtime';
import 'dotenv/config';
import { z } from 'zod';

const dbSchema = runtimeSchema.extend({
  ...databaseSchema.shape,
  DATABASE_URL: z.url(),
});

export const env = createServerEnv(dbSchema, 'db');
