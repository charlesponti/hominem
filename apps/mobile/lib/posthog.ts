import { PostHog } from 'posthog-react-native';

import { POSTHOG_API_KEY, POSTHOG_HOST } from '~/utils/constants';

const disabled = __DEV__ || !POSTHOG_API_KEY;

if (disabled) {
  console.warn('[PostHog] Analytics disabled — events will not be recorded.', {
    reason: !POSTHOG_API_KEY ? 'missing EXPO_PUBLIC_POSTHOG_API_KEY' : 'DEV mode',
  });
}

export const posthog = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  disabled,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      // Leave console empty — PostHogErrorBoundary is used, which would double-capture
      console: [],
    },
  },
});
