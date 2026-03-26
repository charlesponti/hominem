import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('LocalStore', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('retries initialization after a transient sqlite failure', async () => {
    const getUserProfile = vi.fn().mockResolvedValue(null)
    const createSQLiteStore = vi
      .fn()
      .mockRejectedValueOnce(new Error('sqlite unavailable'))
      .mockResolvedValue({
        clearAllData: vi.fn().mockResolvedValue(true),
        getSettings: vi.fn().mockResolvedValue(null),
        getUserProfile,
        listMedia: vi.fn().mockResolvedValue([]),
        upsertMedia: vi.fn(),
        upsertSettings: vi.fn(),
        upsertUserProfile: vi.fn(),
      })

    vi.doMock('../utils/local-store/sqlite', () => ({
      createSQLiteStore,
    }))

    const { LocalStore } = await import('../utils/local-store')

    await expect(LocalStore.getUserProfile()).rejects.toThrow('sqlite unavailable')
    await expect(LocalStore.getUserProfile()).resolves.toBeNull()
    expect(createSQLiteStore).toHaveBeenCalledTimes(2)
    expect(getUserProfile).toHaveBeenCalledTimes(1)
  })
})
