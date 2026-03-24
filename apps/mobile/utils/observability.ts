import { AppState, type AppStateStatus } from 'react-native';

import { posthog } from '~/lib/posthog';

/**
 * Initialize observability for the mobile app
 * Includes PostHog for analytics and best-effort OpenTelemetry for traces
 */
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

  // Initialize OpenTelemetry (best-effort for React Native)
  // Note: React Native has limited OTel support, so this is optional
  initMobileTelemetry().catch((error) => {
    console.log('[Telemetry] OTel initialization skipped:', error.message);
  });

  return () => {
    subscription.remove();
    posthog.flush().catch((error) => {
      console.error('[PostHog] Final flush failed:', error);
    });
  };
};

/**
 * Initialize OpenTelemetry for mobile
 * React Native has limited OTel support, so this is best-effort and optional
 */
async function initMobileTelemetry() {
  // Skip OTel in React Native - it requires complex native module setup
  // PostHog provides sufficient analytics for mobile
  console.log(
    '[Telemetry] Using PostHog for mobile analytics (OTel not available in React Native)',
  );

  // Future: Could integrate with native OTel SDKs here if needed
  // For now, PostHog covers mobile observability needs
}
