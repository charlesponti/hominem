import { describe, expect, it } from 'vitest';
import {
  baseClientSchema,
  baseServerSchema,
  roccoClientSchema,
  roccoServerSchema,
  notesClientSchema,
  notesServerSchema,
  financeClientSchema,
  financeServerSchema,
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

describe('App-Specific Schemas', () => {
  describe('roccoClientSchema', () => {
    it('should validate correct rocco client env', () => {
      const validEnv = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_APP_BASE_URL: 'https://rocco.example.com',
        VITE_GOOGLE_API_KEY: 'test-google-key',
      };

      expect(() => roccoClientSchema.parse(validEnv)).not.toThrow();
    });

    it('should reject missing app-specific fields', () => {
      const invalidEnv = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        // Missing VITE_APP_BASE_URL and VITE_GOOGLE_API_KEY
      };

      expect(() => roccoClientSchema.parse(invalidEnv)).toThrow();
    });
  });

  describe('roccoServerSchema', () => {
    it('should validate correct rocco server env', () => {
      const validEnv = {
        PUBLIC_API_URL: 'https://api.example.com',
        SUPABASE_URL: 'https://supabase.example.com',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        DATABASE_URL: 'postgresql://localhost:5432/db',
        GOOGLE_API_KEY: 'test-google-key',
      };

      expect(() => roccoServerSchema.parse(validEnv)).not.toThrow();
    });

    it('should accept optional server fields', () => {
      const envWithOptionals = {
        PUBLIC_API_URL: 'https://api.example.com',
        SUPABASE_URL: 'https://supabase.example.com',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        DATABASE_URL: 'postgresql://localhost:5432/db',
        BETTER_AUTH_SECRET: 'secret',
        BETTER_AUTH_URL: 'https://auth.example.com',
      };

      const result = roccoServerSchema.parse(envWithOptionals);
      expect(result.BETTER_AUTH_SECRET).toBe('secret');
      expect(result.BETTER_AUTH_URL).toBe('https://auth.example.com');
    });
  });

  describe('notesClientSchema', () => {
    it('should validate correct notes client env', () => {
      const validEnv = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_APP_BASE_URL: 'https://notes.example.com',
      };

      expect(() => notesClientSchema.parse(validEnv)).not.toThrow();
    });

    it('should use default for feature flags', () => {
      const env = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_APP_BASE_URL: 'https://notes.example.com',
      };

      const result = notesClientSchema.parse(env);
      expect(result.VITE_FEATURE_TWITTER_INTEGRATION).toBe('false');
    });
  });

  describe('financeSchemas', () => {
    it('should validate correct finance client env', () => {
      const validEnv = {
        VITE_PUBLIC_API_URL: 'https://api.example.com',
        VITE_SUPABASE_URL: 'https://supabase.example.com',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_APP_BASE_URL: 'https://finance.example.com',
      };

      expect(() => financeClientSchema.parse(validEnv)).not.toThrow();
    });

    it('should validate correct finance server env', () => {
      const validEnv = {
        PUBLIC_API_URL: 'https://api.example.com',
        SUPABASE_URL: 'https://supabase.example.com',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        DATABASE_URL: 'postgresql://localhost:5432/db',
      };

      expect(() => financeServerSchema.parse(validEnv)).not.toThrow();
    });
  });
});
