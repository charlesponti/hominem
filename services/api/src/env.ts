import 'dotenv/config';
import { createServerEnv } from '@hominem/env';

import { apiSchema } from './env.schema';

export const env = createServerEnv(apiSchema, 'apiServer');
