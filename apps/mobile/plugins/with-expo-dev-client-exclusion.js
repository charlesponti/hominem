const { withPodfile } = require('expo/config-plugins')
const { getAppVariant, getPodfileUseExpoModulesLine } = require('../config/appVariant')

module.exports = function withExpoDevClientExclusion(config) {
  return withPodfile(config, (config) => {
    const appVariant = getAppVariant(config.extra?.appVariant ?? process.env.APP_VARIANT ?? 'dev')
    const useExpoModulesLine = getPodfileUseExpoModulesLine(appVariant)
    const pattern = /^  use_expo_modules!(?:\(exclude: \[[^\]]*\]\))?\s*$/m

    if (!pattern.test(config.modResults.contents)) {
      throw new Error(
        '[with-expo-dev-client-exclusion] Could not find `use_expo_modules!` line in Podfile. ' +
          'The Podfile format may have changed. Please update the plugin regex.',
      )
    }

    config.modResults.contents = config.modResults.contents.replace(pattern, useExpoModulesLine)

    return config
  })
}
