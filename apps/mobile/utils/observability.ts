import { posthog } from '~/lib/posthog'

export const initObservability = () => {
  // PostHog is initialised via the singleton in lib/posthog.ts.
  // This function is the extension point for any additional setup
  // (e.g. flushing on app background, enabling session recording).
  return posthog
}
