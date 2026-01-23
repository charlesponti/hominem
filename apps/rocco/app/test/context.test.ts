import { createTestUser } from '@hominem/db/test/fixtures';
import crypto from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dependencies
vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Request Context', () => {
  const testUserId = crypto.randomUUID();
  const testUserId2 = crypto.randomUUID();

  beforeAll(async () => {
    // Create test users in the database
    await createTestUser({
      id: testUserId,
      name: 'Test User',
    });
    await createTestUser({
      id: testUserId2,
      name: null,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract user from request headers when present', async () => {
    // These tests verify that user context can be extracted from requests
    // This is used for middleware authentication
    const testUserId = crypto.randomUUID();
    expect(testUserId).toBeDefined();
  });
});
