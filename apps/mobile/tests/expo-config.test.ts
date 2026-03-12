import { describe, expect, it } from 'vitest'

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
    aiSdkChatWebEnabled: string
    aiSdkChatMobileEnabled: string
    aiSdkTranscribeEnabled: string
    aiSdkSpeechEnabled: string
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
      aiSdkChatWebEnabled: 'false',
      aiSdkChatMobileEnabled: 'false',
      aiSdkTranscribeEnabled: 'false',
      aiSdkSpeechEnabled: 'false',
      mobilePasskeyEnabled: 'false',
    })
  })

  it('preserves explicit env values', () => {
    expect(
      getExpoExtraConfig({
        EXPO_PUBLIC_API_BASE_URL: 'https://api.ponti.io',
        EXPO_PUBLIC_E2E_TESTING: 'true',
        EXPO_PUBLIC_E2E_AUTH_SECRET: 'secret',
        EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED: 'true',
        EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED: 'true',
        EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED: 'true',
        EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED: 'true',
        EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED: 'true',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.ponti.io',
      e2eTesting: 'true',
      e2eAuthSecret: 'secret',
      aiSdkChatWebEnabled: 'true',
      aiSdkChatMobileEnabled: 'true',
      aiSdkTranscribeEnabled: 'true',
      aiSdkSpeechEnabled: 'true',
      mobilePasskeyEnabled: 'true',
    })
  })
})
