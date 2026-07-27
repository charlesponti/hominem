import { PostHog } from 'posthog-react-native';

import { E2E_TESTING } from '~/constants';
import { env } from '~/env';

const apiKey = env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = env.EXPO_PUBLIC_POSTHOG_HOST;
const disabled = __DEV__ || E2E_TESTING || !apiKey;
export const POSTHOG_ENABLED = !disabled;

function createNoopPostHog() {
  return {
    capture() {},
    captureException() {},
    flush() {
      return Promise.resolve();
    },
    identify() {},
    reset() {},
  };
}

export const posthog = disabled
  ? createNoopPostHog()
  : new PostHog(apiKey, {
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
