import { PostHog } from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

console.log('[PostHog] Initializing with:', {
  apiKey: apiKey ? `${apiKey.slice(0, 10)}...` : '(missing)',
  host,
  disabled: __DEV__ || !apiKey,
});

export const posthog = new PostHog(apiKey, {
  host,
  disabled: __DEV__ || !apiKey,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      // Leave console empty — PostHogErrorBoundary is used, which would double-capture
      console: [],
    },
  },
});
