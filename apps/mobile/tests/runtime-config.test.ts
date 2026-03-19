import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('mobile runtime config', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.APP_VARIANT
    delete process.env.EXPO_PUBLIC_API_BASE_URL
  })

  afterEach(() => {
    vi.unmock('expo-device')
    vi.unmock('expo-constants')
  })

  it('treats preview and production as release variants', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.ponti.io'
    vi.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          extra: {
            appVariant: 'preview',
          },
        },
      },
    }))
    vi.doMock('expo-device', () => ({
      isDevice: true,
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
            appVariant: 'preview',
          },
        },
      },
    }))
    vi.doMock('expo-device', () => ({
      isDevice: true,
    }))

    await expect(import('../utils/constants')).rejects.toThrow(
      'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL in mobile runtime configuration for preview.',
    )
  })

  it('keeps localhost for simulator runtimes', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:4040'
    vi.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          hostUri: '192.168.1.153:8081',
          extra: {
            appVariant: 'dev',
            apiBaseUrl: 'http://localhost:4040',
          },
        },
      },
    }))
    vi.doMock('expo-device', () => ({
      isDevice: false,
    }))

    const { API_BASE_URL } = await import('../utils/constants')

    expect(API_BASE_URL).toBe('http://localhost:4040')
  })

  it('rewrites localhost for physical devices', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:4040'
    vi.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          hostUri: '192.168.1.153:8081',
          extra: {
            appVariant: 'dev',
            apiBaseUrl: 'http://localhost:4040',
          },
        },
      },
    }))
    vi.doMock('expo-device', () => ({
      isDevice: true,
    }))

    const { API_BASE_URL } = await import('../utils/constants')

    expect(API_BASE_URL).toBe('http://192.168.1.153:4040')
  })

  it('uses the canonical local API fallback port in development', async () => {
    vi.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          hostUri: '192.168.1.153:8081',
          extra: {
            appVariant: 'dev',
          },
        },
      },
    }))
    vi.doMock('expo-device', () => ({
      isDevice: false,
    }))

    const { API_BASE_URL } = await import('../utils/constants')

    expect(API_BASE_URL).toBe('http://localhost:4040')
  })
})
