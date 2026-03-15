import { AppState, type AppStateStatus } from 'react-native';
import { posthog } from '~/lib/posthog';

export const initObservability = () => {
  // PostHog is initialised via the singleton in lib/posthog.ts.
  // This function is the extension point for any additional setup
  // (e.g. flushing on app background, enabling session recording).

  // Listen for app state changes and flush events when backgrounding
  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'background') {
      console.log('[PostHog] App backgrounded, flushing events');
      posthog.flush().catch((error) => {
        console.error('[PostHog] Flush failed:', error);
      });
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    subscription.remove();
    posthog.flush().catch((error) => {
      console.error('[PostHog] Final flush failed:', error);
    });
  };
};
