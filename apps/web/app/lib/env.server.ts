import 'dotenv/config';
import { createServerEnv } from '@hominem/env';
import { webSchema } from './env.schema';

export const serverEnv = createServerEnv(webSchema, 'notesServer');
