import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import type { ReactNode } from 'react'

const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'

if (apiKey && typeof window !== 'undefined') {
  posthog.init(apiKey, {
    api_host: host,
    // Disable in development unless a key is explicitly set
    loaded: (ph) => {
      if (import.meta.env.DEV && !apiKey) {
        ph.opt_out_capturing()
      }
    },
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  })
}

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  if (!apiKey) {
    // No PostHog key: render children directly; useFeatureFlag returns false.
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
