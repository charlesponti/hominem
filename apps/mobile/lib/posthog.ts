import { PostHog } from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const disabled = __DEV__ || !apiKey;

if (disabled) {
  console.warn('[PostHog] Analytics disabled — events will not be recorded.', {
    reason: !apiKey ? 'missing EXPO_PUBLIC_POSTHOG_API_KEY' : 'DEV mode',
  });
}

export const posthog = new PostHog(apiKey, {
  host,
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
