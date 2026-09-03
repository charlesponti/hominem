import 'dotenv/config';
import { createServerEnv } from '@hominem/env';

import { careerSchema } from './env.schema';

export const serverEnv = createServerEnv(careerSchema, 'careerServer');
