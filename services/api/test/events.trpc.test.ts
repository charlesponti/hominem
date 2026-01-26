import type { AppRouter } from '@hominem/trpc';

import { cleanupTestData, createTestUser } from '@hominem/db/test/utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createServer } from '../src/server.js';
import { createTRPCTestClient } from './trpc-test-utils.js';

describe('Events tRPC Router', () => {
  let server: ReturnType<typeof createServer>;
  let testUserId: string;
  let trpc: ReturnType<typeof createTRPCTestClient>;

  beforeEach(async () => {
    server = createServer();
    testUserId = await createTestUser();
    trpc = createTRPCTestClient(server, testUserId);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('events.list', () => {
    it('should list events', async () => {
      const result = await trpc.events.list.query({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter events by type', async () => {
      // Create an event first
      await trpc.events.create.mutate({
        title: 'Test Event',
        type: 'Events',
        date: new Date().toISOString(),
      });

      const result = await trpc.events.list.query({
        tagNames: ['Events'],
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('events.create', () => {
    it('should create an event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        date: new Date().toISOString(),
        type: 'Events',
      };

      const result = await trpc.events.create.mutate(eventData);

      expect(result).toBeDefined();
      expect(result.title).toBe(eventData.title);
      expect(result.description).toBe(eventData.description);
    });

    it('should create an event with tags', async () => {
      const eventData = {
        title: 'Test Event',
        date: new Date().toISOString(),
        tags: ['tag1', 'tag2'],
      };

      const result = await trpc.events.create.mutate(eventData);

      expect(result.tags).toBeDefined();
      expect(result.tags?.length).toBe(2);
    });
  });

  describe('events.get', () => {
    it('should get an event by id', async () => {
      const created = await trpc.events.create.mutate({
        title: 'Test Event',
        date: new Date().toISOString(),
      });

      const result = await trpc.events.get.query({ id: created.id });

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.title).toBe('Test Event');
    });

    it('should return null for non-existent event', async () => {
      const result = await trpc.events.get.query({
        id: '00000000-0000-0000-0000-000000000000',
      });

      expect(result).toBeNull();
    });
  });

  describe('events.update', () => {
    it('should update an event', async () => {
      const created = await trpc.events.create.mutate({
        title: 'Original Title',
        date: new Date().toISOString(),
      });

      const updated = await trpc.events.update.mutate({
        id: created.id,
        title: 'Updated Title',
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
    });
  });

  describe('events.delete', () => {
    it('should delete an event', async () => {
      const created = await trpc.events.create.mutate({
        title: 'Test Event',
        date: new Date().toISOString(),
      });

      const deleted = await trpc.events.delete.mutate({ id: created.id });

      expect(deleted).toBe(true);

      // Verify it's deleted
      const result = await trpc.events.get.query({ id: created.id });
      expect(result).toBeNull();
    });
  });

  describe('events.getSyncStatus', () => {
    it('should get sync status', async () => {
      const result = await trpc.events.getSyncStatus.query();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('lastSyncedAt');
      expect(result).toHaveProperty('syncError');
      expect(result).toHaveProperty('eventCount');
      expect(result).toHaveProperty('connected');
    });
  });
});
