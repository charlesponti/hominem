import 'dotenv/config';
import { createServerEnv } from '@hominem/env';
import { webSchema } from '@hominem/env/web';

export const serverEnv = createServerEnv(webSchema, 'notesServer');
