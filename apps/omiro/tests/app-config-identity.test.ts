import { afterEach, describe, expect, it } from 'vitest';

import { getAppEnvironment } from '~/app.config';

const ENV_KEYS = ['APP_ENV', 'EAS_BUILD', 'EAS_BUILD_PROFILE', 'CI'] as const;
const originalEnv: Record<(typeof ENV_KEYS)[number], string | undefined> = {
  APP_ENV: undefined,
  EAS_BUILD: undefined,
  EAS_BUILD_PROFILE: undefined,
  CI: undefined,
};

for (const key of ENV_KEYS) {
  originalEnv[key] = process.env[key];
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

// This resolver exists because a locally-run "production" build once picked
// up an ambient APP_ENV from .env.development.local and silently shipped
// the dev app identity to the App Store. It must never guess.
describe('getAppEnvironment', () => {
  it('defaults to development outside EAS and CI', () => {
    delete process.env.APP_ENV;
    delete process.env.EAS_BUILD;
    delete process.env.CI;

    expect(getAppEnvironment()).toBe('development');
  });

  it('uses APP_ENV directly outside EAS', () => {
    delete process.env.EAS_BUILD;
    process.env.APP_ENV = 'production';

    expect(getAppEnvironment()).toBe('production');
  });

  it('uses EAS_BUILD_PROFILE when running on an EAS builder', () => {
    process.env.EAS_BUILD = 'true';
    process.env.EAS_BUILD_PROFILE = 'production';
    delete process.env.APP_ENV;

    expect(getAppEnvironment()).toBe('production');
  });

  it('allows EAS_BUILD_PROFILE and a matching APP_ENV', () => {
    process.env.EAS_BUILD = 'true';
    process.env.EAS_BUILD_PROFILE = 'production';
    process.env.APP_ENV = 'production';

    expect(getAppEnvironment()).toBe('production');
  });

  it('throws when APP_ENV conflicts with EAS_BUILD_PROFILE instead of guessing', () => {
    process.env.EAS_BUILD = 'true';
    process.env.EAS_BUILD_PROFILE = 'production';
    process.env.APP_ENV = 'development';

    expect(() => getAppEnvironment()).toThrow(/conflicts with EAS_BUILD_PROFILE/);
  });

  it('throws when EAS_BUILD is set but EAS_BUILD_PROFILE is missing', () => {
    process.env.EAS_BUILD = 'true';
    delete process.env.EAS_BUILD_PROFILE;
    delete process.env.APP_ENV;

    expect(() => getAppEnvironment()).toThrow(/EAS_BUILD_PROFILE is missing/);
  });

  it('throws under CI with no APP_ENV rather than defaulting', () => {
    delete process.env.EAS_BUILD;
    delete process.env.APP_ENV;
    process.env.CI = 'true';

    expect(() => getAppEnvironment()).toThrow(/APP_ENV must be set explicitly/);
  });

  it('rejects an unsupported environment value', () => {
    delete process.env.EAS_BUILD;
    process.env.APP_ENV = 'staging';

    expect(() => getAppEnvironment()).toThrow();
  });
});
