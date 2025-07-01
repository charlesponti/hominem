import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import crypto from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiTestLifecycle } from '../../test/api-test-utils.js'
import { createTRPCTestClient } from '../../test/trpc-test-utils.js'
import type { AppEnv } from '../server.js'

vi.mock('../services/vector.service.js', () => ({
  SupabaseVectorService: {
    query: vi.fn(),
    searchDocumentsByUser: vi.fn(),
    getUserDocuments: vi.fn(),
    getUserFiles: vi.fn(),
    deleteUserDocuments: vi.fn(),
    deleteUserFile: vi.fn(),
  },
}))

describe('Vector System', () => {
  const { getServer } = useApiTestLifecycle()
  let server: Hono<AppEnv>
  let trpc: ReturnType<typeof createTRPCTestClient>
  let testUserId: string

  beforeAll(async () => {
    testUserId = crypto.randomUUID()

    await db.insert(users).values({
      id: testUserId,
      email: `vector-test-${testUserId}@example.com`,
      supabaseId: `supabase-${testUserId}`,
    })

    server = getServer()
    trpc = createTRPCTestClient(server, testUserId)
  })

  afterAll(async () => {
    // Clean up test user
    await db.delete(users).where(eq(users.id, testUserId))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tRPC Vector Router', () => {
    it('should query vector store', async () => {
      const mockResponse = {
        results: [
          {
            id: 'doc-1',
            document: 'Test document content',
            metadata: { source: 'test' },
            source: 'test-index',
            sourceType: 'csv',
          },
        ],
      }

      const { SupabaseVectorService } = await import('../services/vector.service.js')
      vi.mocked(SupabaseVectorService.query).mockResolvedValue(mockResponse)

      const result = await trpc.vector.query.query({
        query: 'test query',
        indexName: 'test-index',
        limit: 5,
      })

      expect(result).toBeDefined()
      expect(result.results).toBeInstanceOf(Array)
      expect(result.results).toHaveLength(1)
    })

    it('should search user documents', async () => {
      const mockResponse = {
        results: [
          {
            id: 'doc-2',
            document: 'User document content',
            metadata: { userId: testUserId },
            source: 'notes',
            sourceType: 'markdown',
          },
        ],
      }

      const { SupabaseVectorService } = await import('../services/vector.service.js')
      vi.mocked(SupabaseVectorService.searchDocumentsByUser).mockResolvedValue(mockResponse)

      const result = await trpc.vector.searchUserDocuments.query({
        query: 'test search',
        limit: 10,
        threshold: 0.7,
      })

      expect(result).toBeDefined()
      expect(result.results).toBeInstanceOf(Array)
      expect(result.results).toHaveLength(1)
    })

    it('should get user documents', async () => {
      const mockDocuments = [
        {
          id: 'doc-3',
          content: 'Document 3 content',
          metadata: '{"title": "Doc 3"}',
          embedding: null,
          userId: testUserId,
          source: 'notes',
          sourceType: 'markdown',
          title: 'Doc 3',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const { SupabaseVectorService } = await import('../services/vector.service.js')
      vi.mocked(SupabaseVectorService.getUserDocuments).mockResolvedValue(mockDocuments)

      const result = await trpc.vector.getUserDocuments.query({
        limit: 20,
        offset: 0,
      })

      expect(result).toBeDefined()
      expect(result.documents).toBeInstanceOf(Array)
      expect(result.documents).toHaveLength(1)
    })

    it('should get user files', async () => {
      const mockFiles = [
        {
          name: 'test-file.csv',
          id: 'file-1',
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          metadata: {},
        },
      ]

      const { SupabaseVectorService } = await import('../services/vector.service.js')
      vi.mocked(SupabaseVectorService.getUserFiles).mockResolvedValue(mockFiles)

      const result = await trpc.vector.getUserFiles.query({
        indexName: 'test-dataset',
      })

      expect(result).toBeDefined()
      expect(result.files).toBeInstanceOf(Array)
      expect(result.files).toHaveLength(1)
    })

    it('should delete user documents', async () => {
      const { SupabaseVectorService } = await import('../services/vector.service.js')
      vi.mocked(SupabaseVectorService.deleteUserDocuments).mockResolvedValue({ success: true })

      const result = await trpc.vector.deleteUserDocuments.mutate({
        source: 'test-source',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.message).toBe('Documents deleted successfully')
    })

    it('should delete user file', async () => {
      const { SupabaseVectorService } = await import('../services/vector.service.js')
      vi.mocked(SupabaseVectorService.deleteUserFile).mockResolvedValue({ success: true })

      const result = await trpc.vector.deleteUserFile.mutate({
        filePath: `${testUserId}/test-dataset/test-file.csv`,
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.message).toBe('File deleted successfully')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid query input', async () => {
      await expect(
        trpc.vector.query.query({
          query: '',
          indexName: 'test-index',
        })
      ).rejects.toThrow()
    })

    it('should handle invalid index name', async () => {
      await expect(
        trpc.vector.query.query({
          query: 'test query',
          indexName: '',
        })
      ).rejects.toThrow()
    })
  })
})
