const isE2eVariant = process.env.APP_VARIANT === 'e2e'

module.exports = {
  dependencies: isE2eVariant
    ? {
        'expo-dev-client': {
          platforms: {
            ios: null,
            android: null,
          },
        },
      }
    : {},
}
