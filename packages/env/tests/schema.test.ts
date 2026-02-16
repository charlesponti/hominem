import { describe, expect, it } from 'vitest';
import {
  baseClientSchema,
  baseServerSchema,
} from '../src/schema';

describe('Base Schemas', () => {
  describe('baseClientSchema', () => {
    it('should validate correct client env', () => {
      const validEnv = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      };

      expect(() => baseClientSchema.parse(validEnv)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidEnv = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        // Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
      };

      expect(() => baseClientSchema.parse(invalidEnv)).toThrow();
    });

    it('should reject invalid URLs', () => {
      const invalidEnv = {
        VITE_PUBLIC_API_URL: 'not-a-url',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      };

      expect(() => baseClientSchema.parse(invalidEnv)).toThrow();
    });
  });

  describe('baseServerSchema', () => {
    it('should validate correct server env', () => {
      const validEnv = {
        PUBLIC_API_URL: 'https://api.example.com',
        SUPABASE_URL: 'https://supabase.example.com',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        DATABASE_URL: 'postgresql://localhost:5432/db',
      };

      expect(() => baseServerSchema.parse(validEnv)).not.toThrow();
    });

    it('should use default values for optional fields', () => {
      const minimalEnv = {
        PUBLIC_API_URL: 'https://api.example.com',
        SUPABASE_URL: 'https://supabase.example.com',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        DATABASE_URL: 'postgresql://localhost:5432/db',
      };

      const result = baseServerSchema.parse(minimalEnv);
      expect(result.PORT).toBe('3000');
      expect(result.NODE_ENV).toBe('development');
      expect(result.PLAID_ENV).toBe('sandbox');
    });

    it('should accept optional fields when provided', () => {
      const envWithOptionals = {
        PUBLIC_API_URL: 'https://api.example.com',
        SUPABASE_URL: 'https://supabase.example.com',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        DATABASE_URL: 'postgresql://localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        GOOGLE_API_KEY: 'test-google-key',
        PORT: '4040',
        NODE_ENV: 'production' as const,
      };

      const result = baseServerSchema.parse(envWithOptionals);
      expect(result.REDIS_URL).toBe('redis://localhost:6379');
      expect(result.GOOGLE_API_KEY).toBe('test-google-key');
      expect(result.PORT).toBe('4040');
      expect(result.NODE_ENV).toBe('production');
    });
  });
});

describe('Schema Extension Pattern', () => {
  it('should allow apps to extend base schemas', () => {
    const { z } = require('zod');
    
    // Simulate app extending base schema
    const appClientSchema = baseClientSchema.extend({
      VITE_APP_BASE_URL: z.string().url(),
      VITE_MY_CUSTOM_VAR: z.string(),
    });

    const validEnv = {
      VITE_PUBLIC_API_URL: 'https://api.example.com',
      VITE_SUPABASE_URL: 'https://supabase.example.com',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_APP_BASE_URL: 'https://myapp.example.com',
      VITE_MY_CUSTOM_VAR: 'custom-value',
    };

    const result = appClientSchema.parse(validEnv);
    expect(result.VITE_PUBLIC_API_URL).toBe('https://api.example.com');
    expect(result.VITE_APP_BASE_URL).toBe('https://myapp.example.com');
    expect(result.VITE_MY_CUSTOM_VAR).toBe('custom-value');
  });

  it('should enforce app-specific required fields', () => {
    const { z } = require('zod');
    
    const appClientSchema = baseClientSchema.extend({
      VITE_REQUIRED_APP_VAR: z.string(),
    });

    const envWithoutAppVar = {
      VITE_PUBLIC_API_URL: 'https://api.example.com',
      VITE_SUPABASE_URL: 'https://supabase.example.com',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      // Missing VITE_REQUIRED_APP_VAR
    };

    expect(() => appClientSchema.parse(envWithoutAppVar)).toThrow();
  });
});
