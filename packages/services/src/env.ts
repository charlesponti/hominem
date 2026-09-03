import { createServerEnv } from '@hominem/env';
import { emailSchema } from '@hominem/env/email';
import { redisSchema } from '@hominem/env/redis';
import { runtimeSchema } from '@hominem/env/runtime';
import 'dotenv/config';
import { z } from 'zod';

const servicesSchema = runtimeSchema.extend({
  ...emailSchema.shape,
  ...redisSchema.shape,
  APP_BASE_URL: z.url().optional(),
});

export const env = createServerEnv(servicesSchema, 'services');
