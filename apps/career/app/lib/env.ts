import { createClientEnv, createServerEnv } from '@hominem/env';
import { z } from 'zod';

const schema = z.object({
  VITE_PUBLIC_API_URL: z.url(),
});

function createEnv() {
  try {
    return createServerEnv(schema, 'career');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('createServerEnv can only be used in Node.js context')
    ) {
      return createClientEnv(schema, 'career');
    }
    throw error;
  }
}

export const serverEnv = createEnv();
