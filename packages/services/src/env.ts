import { createServerEnv } from '@hominem/env';
import { baseSchema } from '@hominem/env/base';
import 'dotenv/config';
import { z } from 'zod';

const servicesSchema = baseSchema.extend({
  APP_BASE_URL: z.url().optional(),
});

export const env = createServerEnv(servicesSchema, 'services');
