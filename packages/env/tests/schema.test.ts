import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { createClientEnv, createServerEnv, EnvValidationError } from '../src/index';

describe('createClientEnv', () => {
  it('should throw EnvValidationError for invalid env', () => {
    const schema = z.object({
      VITE_REQUIRED_VAR: z.string().min(1),
    });

    const env = createClientEnv(schema, 'test');

    expect(() => env.VITE_REQUIRED_VAR).toThrow(EnvValidationError);
  });
});

describe('createServerEnv', () => {
  it('should throw EnvValidationError for invalid env', () => {
    const schema = z.object({
      DATABASE_URL: z.string().url(),
    });

    const env = createServerEnv(schema, 'test');

    expect(() => env.DATABASE_URL).toThrow(EnvValidationError);
  });
});

describe('EnvValidationError', () => {
  it('should format error with context', () => {
    const error = new EnvValidationError('Test error', 'testContext', [
      { path: 'FIELD_NAME', message: 'is required' },
    ]);

    expect(error.context).toBe('testContext');
    expect(error.message).toContain('Test error');
    expect(error.issues).toHaveLength(1);
  });
});
