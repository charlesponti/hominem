import { describe, expect, it } from 'vitest';

import { parseAppEnvironment, parseOmiroEnvironment } from '~/env';

describe('parseOmiroEnvironment', () => {
  it('requires an explicit API address', () => {
    expect(() => parseOmiroEnvironment({})).toThrow('Missing EXPO_PUBLIC_API_BASE_URL');
  });

  it.each([
    'http://localhost:4040',
    'http://192.168.1.12:4040',
    'https://omiro-dev.example.test',
    'https://api.omiro.app',
  ])('uses the explicitly configured URL without rewriting it: %s', (EXPO_PUBLIC_API_BASE_URL) => {
    const env = parseOmiroEnvironment({ EXPO_PUBLIC_API_BASE_URL });

    expect(env.EXPO_PUBLIC_API_BASE_URL).toBe(EXPO_PUBLIC_API_BASE_URL);
  });

  it('applies optional observability defaults', () => {
    expect(
      parseOmiroEnvironment({ EXPO_PUBLIC_API_BASE_URL: 'http://localhost:4040' }),
    ).toMatchObject({
      EXPO_PUBLIC_POSTHOG_API_KEY: '',
      EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
    });
  });
});

describe('parseAppEnvironment', () => {
  it('defaults to development and rejects unsupported environments', () => {
    expect(parseAppEnvironment(undefined)).toBe('development');
    expect(() => parseAppEnvironment('preview')).toThrow();
  });
});
