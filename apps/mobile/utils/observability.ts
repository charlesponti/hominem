import * as Sentry from '@sentry/react-native'

let hasInitialized = false

export const initObservability = () => {
  if (hasInitialized) return
  hasInitialized = true

  const tracesSampleRate = __DEV__ ? 0.2 : 1.0
  const profilesSampleRate = __DEV__ ? 0.2 : 1.0

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    // Reduce dev client overhead; keep prod at full sampling unless configured otherwise.
    tracesSampleRate,
    _experiments: {
      profilesSampleRate,
    },
  })
}
