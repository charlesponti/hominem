import { createServerEnv } from '@hominem/env';
import { aiSchema } from '@hominem/env/ai';

export const env = createServerEnv(aiSchema, 'ai');
