import { describe, expect, it } from 'vitest'

const { assertReleaseEnv, canUseLocalEnvFile } = require('../config/release-env-policy.js') as {
  assertReleaseEnv: (variant: string, env: Record<string, string | undefined>) => void
  canUseLocalEnvFile: (variant: string) => boolean
}

describe('release env policy', () => {
  it('allows local env files for development variants only', () => {
    expect(canUseLocalEnvFile('dev')).toBe(true)
    expect(canUseLocalEnvFile('e2e')).toBe(true)
    expect(canUseLocalEnvFile('preview')).toBe(false)
    expect(canUseLocalEnvFile('production')).toBe(false)
  })

  it('requires API base URL for preview releases', () => {
    expect(() => assertReleaseEnv('preview', {})).toThrow(
      'Missing release env var EXPO_PUBLIC_API_BASE_URL for preview',
    )
  })

  it('requires API base URL for production releases', () => {
    expect(() => assertReleaseEnv('production', {})).toThrow(
      'Missing release env var EXPO_PUBLIC_API_BASE_URL for production',
    )
  })

  it('accepts populated release env values', () => {
    expect(() =>
      assertReleaseEnv('preview', {
        EXPO_PUBLIC_API_BASE_URL: 'https://api.hominem.test',
      }),
    ).not.toThrow()

    expect(() =>
      assertReleaseEnv('production', {
        EXPO_PUBLIC_API_BASE_URL: 'https://api.ponti.io',
      }),
    ).not.toThrow()
  })
})
