import 'dotenv/config';
import { createServerEnv } from '@hominem/env';
import { careerSchema } from '@hominem/env/career';

export const serverEnv = createServerEnv(careerSchema, 'careerServer');
