import { describe, expect, it } from 'vitest';

import { aiSchema } from './ai';
import { databaseSchema } from './database';
import { emailSchema } from './email';
import { redisSchema } from './redis';
import { runtimeSchema } from './runtime';
import { storageSchema } from './storage';

describe('core environment fragments', () => {
  it('keeps domains isolated and preserves defaults', () => {
    expect(Object.keys(runtimeSchema.shape)).toEqual(['NODE_ENV', 'ENV']);
    expect(Object.keys(redisSchema.shape)).toEqual(['REDIS_URL']);
    expect(Object.keys(databaseSchema.shape)).toContain('DATABASE_URL');
    expect(Object.keys(aiSchema.shape)).toContain('CHAT_MODEL');
    expect(Object.keys(emailSchema.shape)).toContain('RESEND_API_KEY');
    expect(Object.keys(storageSchema.shape)).toContain('R2_ENDPOINT');
    expect(runtimeSchema.parse({}).NODE_ENV).toBe('development');
    expect(redisSchema.parse({}).REDIS_URL).toBe('redis://localhost:6379');
    expect(runtimeSchema.parse({ ENV: 'scripted' }).ENV).toBe('scripted');
  });
});
