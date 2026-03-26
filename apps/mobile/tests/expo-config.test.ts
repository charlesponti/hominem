import { describe, expect, it } from 'vitest'
import appConfig from '../app.config'

const { EXPO_OWNER, EXPO_PROJECT_ID, EXPO_PROJECT_SLUG, getExpoExtraConfig } = require(
  '../config/expo-config.js',
) as {
  EXPO_OWNER: string
  EXPO_PROJECT_ID: string
  EXPO_PROJECT_SLUG: string
  getExpoExtraConfig: (env: Record<string, string | undefined>) => {
    apiBaseUrl: string
    e2eTesting: string
    e2eAuthSecret: string
    mobilePasskeyEnabled: string
  }
}

describe('expo config helpers', () => {
  it('returns stable expo identity', () => {
    expect(EXPO_OWNER).toBe('pontistudios')
    expect(EXPO_PROJECT_ID).toBe('4dfac82b-644f-4ff3-be42-e8f941287aa1')
    expect(EXPO_PROJECT_SLUG).toBe('hakumi')
  })

  it('fills release-sensitive extra fields with deterministic defaults', () => {
    expect(getExpoExtraConfig({})).toEqual({
      apiBaseUrl: '',
      e2eTesting: 'false',
      e2eAuthSecret: '',
      mobilePasskeyEnabled: 'false',
    })
  })

  it('preserves explicit env values', () => {
    expect(
      getExpoExtraConfig({
        EXPO_PUBLIC_E2E_TESTING: 'true',
        EXPO_PUBLIC_E2E_AUTH_SECRET: 'secret',
        EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED: 'true',
        EXPO_PUBLIC_API_BASE_URL: 'http://localhost:4040',
      }),
    ).toEqual({
      apiBaseUrl: 'http://localhost:4040',
      e2eTesting: 'true',
      e2eAuthSecret: 'secret',
      mobilePasskeyEnabled: 'true',
    })
  })

  it('includes calendar usage descriptions in ios info plist', () => {
    const previousVariant = process.env.APP_VARIANT

    process.env.APP_VARIANT = 'dev'

    const config = appConfig({ config: {}, packageJsonPath: '', projectRoot: '', staticConfigPath: '' })

    expect(config.ios?.infoPlist).toMatchObject({
      ITSAppUsesNonExemptEncryption: false,
      NSCalendarsUsageDescription: 'Allow Hakumi to access your calendar to add events.',
      NSCalendarsFullAccessUsageDescription: 'Allow Hakumi to access your calendar to add events.',
      NSRemindersUsageDescription: 'Allow Hakumi to access your reminders.',
      NSRemindersFullAccessUsageDescription: 'Allow Hakumi to access your reminders.',
    })

    if (previousVariant === undefined) {
      delete process.env.APP_VARIANT
    } else {
      process.env.APP_VARIANT = previousVariant
    }
  })

  it('keeps release variants free of dev-only apple signing config', () => {
    const previousVariant = process.env.APP_VARIANT
    const previousTeamId = process.env.EXPO_APPLE_TEAM_ID

    process.env.APP_VARIANT = 'preview'
    process.env.EXPO_APPLE_TEAM_ID = '3QHJ2KN8AL'

    const config = appConfig({ config: {}, packageJsonPath: '', projectRoot: '', staticConfigPath: '' })

    expect(config.ios?.appleTeamId).toBeUndefined()

    if (previousVariant === undefined) {
      delete process.env.APP_VARIANT
    } else {
      process.env.APP_VARIANT = previousVariant
    }

    if (previousTeamId === undefined) {
      delete process.env.EXPO_APPLE_TEAM_ID
    } else {
      process.env.EXPO_APPLE_TEAM_ID = previousTeamId
    }
  })

  it('derives the app group from the active bundle identifier', () => {
    const previousVariant = process.env.APP_VARIANT

    process.env.APP_VARIANT = 'preview'

    const config = appConfig({ config: {}, packageJsonPath: '', projectRoot: '', staticConfigPath: '' })

    expect(config.ios?.bundleIdentifier).toBe('com.pontistudios.hakumi.preview')
    expect(config.ios?.entitlements?.['com.apple.security.application-groups']).toEqual([
      'group.com.pontistudios.hakumi.preview',
    ])

    if (previousVariant === undefined) {
      delete process.env.APP_VARIANT
    } else {
      process.env.APP_VARIANT = previousVariant
    }
  })
})
