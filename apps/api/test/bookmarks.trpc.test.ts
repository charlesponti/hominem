import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from '../src/server.js'
import { cleanupTestData, createTestUser } from './db-test-utils.js'
import { createTRPCTestClient } from './trpc-test-utils.js'

describe('Bookmarks tRPC Router', () => {
  let server: ReturnType<typeof createServer>
  let testUserId: string

  beforeEach(async () => {
    server = createServer()
    testUserId = await createTestUser()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('should list bookmarks for authenticated user', async () => {
    const trpc = createTRPCTestClient(server, testUserId)

    const bookmarks = await trpc.bookmarks.list.query()

    expect(Array.isArray(bookmarks)).toBe(true)
  })

  it('should create a new bookmark', async () => {
    const trpc = createTRPCTestClient(server, testUserId)

    const testUrl = 'https://example.com'
    const newBookmark = await trpc.bookmarks.create.mutate({
      url: testUrl,
    })

    expect(newBookmark).toBeDefined()
    expect(newBookmark.url).toBe(testUrl)
    expect(newBookmark.userId).toBe(testUserId)
    expect(newBookmark.title).toBeDefined()
  })

  it('should update an existing bookmark', async () => {
    const trpc = createTRPCTestClient(server, testUserId)

    // First create a bookmark
    const testUrl = 'https://example.com'
    const newBookmark = await trpc.bookmarks.create.mutate({
      url: testUrl,
    })

    // Then update it
    const updatedUrl = 'https://updated-example.com'
    const updatedBookmark = await trpc.bookmarks.update.mutate({
      id: newBookmark.id,
      url: updatedUrl,
    })

    expect(updatedBookmark).toBeDefined()
    expect(updatedBookmark.url).toBe(updatedUrl)
    expect(updatedBookmark.id).toBe(newBookmark.id)
  })

  it('should delete a bookmark', async () => {
    const trpc = createTRPCTestClient(server, testUserId)

    // First create a bookmark
    const testUrl = 'https://example.com'
    const newBookmark = await trpc.bookmarks.create.mutate({
      url: testUrl,
    })

    // Then delete it
    const result = await trpc.bookmarks.delete.mutate({
      id: newBookmark.id,
    })

    expect(result.success).toBe(true)

    // Verify it's deleted by trying to list bookmarks
    const bookmarks = await trpc.bookmarks.list.query()
    expect(bookmarks.find((b) => b.id === newBookmark.id)).toBeUndefined()
  })

  it('should handle invalid URL in create', async () => {
    const trpc = createTRPCTestClient(server, testUserId)

    await expect(
      trpc.bookmarks.create.mutate({
        url: 'invalid-url',
      })
    ).rejects.toThrow()
  })

  it('should handle invalid URL in update', async () => {
    const trpc = createTRPCTestClient(server, testUserId)

    // First create a bookmark
    const testUrl = 'https://example.com'
    const newBookmark = await trpc.bookmarks.create.mutate({
      url: testUrl,
    })

    // Then try to update with invalid URL
    await expect(
      trpc.bookmarks.update.mutate({
        id: newBookmark.id,
        url: 'invalid-url',
      })
    ).rejects.toThrow()
  })
})
