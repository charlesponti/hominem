'use client'

import { createContext, useContext, type ReactNode } from 'react'

// Define available feature flags
export interface FeatureFlags {
  twitterIntegration: boolean
  // Add more feature flags here as needed
}

// Default feature flag values
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  twitterIntegration: false,
}

// Feature flags context
const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULT_FEATURE_FLAGS)

// Hook to use feature flags
export function useFeatureFlags(): FeatureFlags {
  const context = useContext(FeatureFlagsContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider')
  }
  return context
}

// Hook to check a specific feature flag
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags()
  return flags[flag]
}

// Provider component
interface FeatureFlagsProviderProps {
  children: ReactNode
  flags?: Partial<FeatureFlags>
}

export function FeatureFlagsProvider({ children, flags = {} }: FeatureFlagsProviderProps) {
  // Get environment-based flags
  const envFlags = useEnvironmentFeatureFlags()

  // Merge provided flags with environment flags and defaults (priority: flags > envFlags > defaults)
  const mergedFlags: FeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...envFlags,
    ...flags,
  }

  return <FeatureFlagsContext.Provider value={mergedFlags}>{children}</FeatureFlagsContext.Provider>
}

// Utility hook to get feature flags from environment variables
export function useEnvironmentFeatureFlags(): Partial<FeatureFlags> {
  // Check environment variables for feature flags
  const twitterIntegration = import.meta.env.VITE_FEATURE_TWITTER_INTEGRATION === 'true'

  return {
    twitterIntegration,
  }
}
