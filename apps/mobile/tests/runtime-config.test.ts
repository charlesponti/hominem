import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('mobile runtime config', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.APP_VARIANT
    delete process.env.EXPO_PUBLIC_API_BASE_URL
  })

  afterEach(() => {
    vi.unmock('expo-constants')
  })

  it('treats preview and production as release variants', async () => {
    vi.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          extra: {
            apiBaseUrl: 'https://api.ponti.io',
            appVariant: 'preview',
          },
        },
      },
    }))

    const { isReleaseAppVariant } = await import('../utils/constants')

    expect(isReleaseAppVariant('preview')).toBe(true)
    expect(isReleaseAppVariant('production')).toBe(true)
    expect(isReleaseAppVariant('dev')).toBe(false)
  })

  it('throws when preview runtime is missing the API base URL', async () => {
    vi.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          extra: {
            apiBaseUrl: '',
            appVariant: 'preview',
          },
        },
      },
    }))

    await expect(import('../utils/constants')).rejects.toThrow(
      'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL in mobile runtime configuration for preview.',
    )
  })
})