import { useFeatureFlag as usePostHogFeatureFlag } from 'posthog-react-native'

// Feature flag keys as defined in PostHog
export const FEATURE_FLAG_KEYS = {
  NEW_AUTH_STATE: 'mobile-new-auth-state',
  NEW_CHAT_STATE: 'mobile-new-chat-state',
  RUNTIME_VALIDATION: 'mobile-runtime-validation',
  ERROR_BOUNDARIES: 'mobile-error-boundaries',
  SQLITE_ONLY_STORAGE: 'mobile-sqlite-only-storage',
} as const

export type MobileFeatureFlagKey = keyof typeof FEATURE_FLAG_KEYS

/**
 * Returns the boolean value of a PostHog feature flag for mobile.
 * Defaults to `false` while PostHog is loading or not configured.
 */
export function useFeatureFlag(flag: MobileFeatureFlagKey): boolean {
  const value = usePostHogFeatureFlag(FEATURE_FLAG_KEYS[flag])
  return value === true || value === 'true'
}
