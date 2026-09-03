import { createClientEnv } from '@hominem/env';
import { webClientSchema } from './env.schema';

let cachedEnv: ReturnType<typeof createClientEnv<typeof webClientSchema>> | null = null;

export function getClientEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = createClientEnv(webClientSchema, 'notesClient');
  return cachedEnv;
}
