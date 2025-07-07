import { db } from '@hominem/data'
import { users } from '@hominem/data/schema'
import crypto from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { useApiTestLifecycle } from '../../test/api-test-utils.js'
import { createTRPCTestClient } from '../../test/trpc-test-utils.js'

vi.mock('../services/vector.service.js', () => ({
  VectorService: {
    query: vi.fn(),
    searchDocumentsByUser: vi.fn(),
    getUserDocuments: vi.fn(),
    deleteUserDocuments: vi.fn(),
  },
}))

vi.mock('@hominem/utils/supabase', () => ({
  fileStorageService: {
    listUserFiles: vi.fn(),
    deleteFile: vi.fn(),
  },
}))

describe('Vector System', () => {
  const { getServer } = useApiTestLifecycle()
  const testUserId = crypto.randomUUID()
  let trpc: ReturnType<typeof createTRPCTestClient>

  // Set up tRPC client
  trpc = createTRPCTestClient(getServer(), testUserId)

  // Create test user
  db.insert(users).values({
    id: testUserId,
    email: 'test@example.com',
    name: 'Test User',
  })

  describe('tRPC Vector Router', () => {
    it('should search vectors', async () => {
      const mockResponse = {
        results: [
          {
            id: 'doc-1',
            document: 'Test document content',
            metadata: { source: 'test' },
            source: 'test-source',
            sourceType: 'markdown',
          },
        ],
      }

      const { VectorService } = await import('../services/vector.service.js')
      vi.mocked(VectorService.query).mockResolvedValue(mockResponse)

      const result = await trpc.vector.searchVectors.query({
        query: 'test search',
        source: 'test-source',
        limit: 10,
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

      const { VectorService } = await import('../services/vector.service.js')
      vi.mocked(VectorService.searchDocumentsByUser).mockResolvedValue(mockResponse)

      const result = await trpc.vector.searchUserVectors.query({
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

      const { VectorService } = await import('../services/vector.service.js')
      vi.mocked(VectorService.getUserDocuments).mockResolvedValue(mockDocuments)

      const result = await trpc.vector.getUserVectors.query({
        limit: 20,
        offset: 0,
      })

      expect(result).toBeDefined()
      expect(result.vectors).toBeInstanceOf(Array)
      expect(result.vectors).toHaveLength(1)
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

      const { fileStorageService } = await import('@hominem/utils/supabase')
      vi.mocked(fileStorageService.listUserFiles).mockResolvedValue(mockFiles as any)

      const result = await trpc.vector.getUserFiles.query()

      expect(result).toBeDefined()
      expect(result.files).toBeInstanceOf(Array)
      expect(result.files).toHaveLength(1)
    })

    it('should delete user documents', async () => {
      const { VectorService } = await import('../services/vector.service.js')
      vi.mocked(VectorService.deleteUserDocuments).mockResolvedValue({ success: true })

      const result = await trpc.vector.deleteUserVectors.mutate({
        source: 'test-source',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.message).toBe('Vector documents deleted successfully')
    })

    it('should delete user file', async () => {
      const { fileStorageService } = await import('@hominem/utils/supabase')
      vi.mocked(fileStorageService.deleteFile).mockResolvedValue(true)

      const result = await trpc.vector.deleteUserFile.mutate({
        fileId: 'test-file-id',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.message).toBe('File deleted successfully')
    })
  })
})
