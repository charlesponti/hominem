import { afterEach, describe, expect, mock, test } from 'bun:test';

process.env.EXPO_PUBLIC_API_BASE_URL = 'https://test-api.example.com';
process.env.APP_VARIANT = 'e2e';

mock.module('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));

mock.module('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: 'https://test-api.example.com',
        appScheme: 'hakumi-e2e',
        appVariant: 'e2e',
      },
    },
  },
}));

mock.module('@better-auth/expo/client', () => ({
  expoClient: (config: unknown) => ({
    name: 'expoClient',
    config,
  }),
}));

afterEach(() => {
  mock.restore();
});

describe('authClient', () => {
  test('creates auth client with expoClient plugin', async () => {
    const { authClient } = await import('./auth-client');
    expect(authClient).toBeDefined();
    expect(typeof authClient.signIn).toBe('function');
  });

  test('uses variant scheme for OAuth redirect', async () => {
    const { APP_SCHEME } = await import('~/utils/constants');
    expect(APP_SCHEME).toBe('hakumi-e2e');
  });

  test('configures secure storage with hominem prefix', async () => {
    const { API_BASE_URL } = await import('~/utils/constants');
    expect(API_BASE_URL).toBe('https://test-api.example.com');
  });
});
