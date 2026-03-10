const { getAppVariantConfig } = require('./config/appVariant')
const variantConfig = getAppVariantConfig()

module.exports = {
  dependencies: variantConfig.usesDevClient
    ? {}
    : {
        'expo-dev-client': {
          platforms: {
            ios: null,
            android: null,
          },
        },
      },
}
