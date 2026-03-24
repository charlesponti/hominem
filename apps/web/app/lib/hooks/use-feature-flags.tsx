import { usePostHog } from 'posthog-js/react'

// Feature flag keys as defined in PostHog
export const FEATURE_FLAG_KEYS = {
  twitterIntegration: 'twitter-integration',
  aiSdkChatWeb: 'ai-sdk-chat-web',
  aiSdkChatMobile: 'ai-sdk-chat-mobile',
  aiSdkTranscribe: 'ai-sdk-transcribe',
  aiSdkSpeech: 'ai-sdk-speech',
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_KEYS

/**
 * Returns the boolean value of a single PostHog feature flag.
 * Defaults to `false` while flags are loading or if PostHog is not initialised.
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const posthog = usePostHog()
  if (!posthog) return false
  return posthog.isFeatureEnabled(FEATURE_FLAG_KEYS[flag]) ?? false
}

/**
 * Returns all feature flags as a typed object.
 */
export function useFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const posthog = usePostHog()
  const enabled = (key: string) => (posthog?.isFeatureEnabled(key) ?? false)

  return {
    twitterIntegration: enabled(FEATURE_FLAG_KEYS.twitterIntegration),
    aiSdkChatWeb: enabled(FEATURE_FLAG_KEYS.aiSdkChatWeb),
    aiSdkChatMobile: enabled(FEATURE_FLAG_KEYS.aiSdkChatMobile),
    aiSdkTranscribe: enabled(FEATURE_FLAG_KEYS.aiSdkTranscribe),
    aiSdkSpeech: enabled(FEATURE_FLAG_KEYS.aiSdkSpeech),
  }
}
