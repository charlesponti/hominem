import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import type { ReactNode } from 'react';

const apiKey = import.meta.env.VITE_POSTHOG_PUBLIC_KEY as string | undefined;
const host =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

if (apiKey && typeof window !== 'undefined') {
  posthog.init(apiKey, {
    api_host: host,
    // note: this whole block only runs when apiKey is set, so this check never fires
    loaded: (ph) => {
      if (import.meta.env.DEV && !apiKey) {
        ph.opt_out_capturing();
      }
    },
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  });
}

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  if (!apiKey) {
    // no key, no provider — useFeatureFlag will just return false
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
