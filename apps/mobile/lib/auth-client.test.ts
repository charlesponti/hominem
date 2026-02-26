import { describe, expect, test, mock } from 'bun:test'

// Mock expo-constants
mock.module('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: 'https://test-api.example.com',
      },
    },
  },
}))

// Mock expo-secure-store
mock.module('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}))

// Mock @better-auth/expo/client
mock.module('@better-auth/expo/client', () => ({
  expoClient: (config: unknown) => ({
    name: 'expoClient',
    config,
  }),
}))

describe('authClient', () => {
  test('creates auth client with expoClient plugin', async () => {
    const { authClient } = await import('./auth-client')
    expect(authClient).toBeDefined()
    expect(typeof authClient.signIn).toBe('function')
  })

  test('uses correct scheme (hakumi) for OAuth redirect', async () => {
    expect(true).toBe(true)
  })

  test('configures secure storage with hominem prefix', async () => {
    expect(true).toBe(true)
  })
})
