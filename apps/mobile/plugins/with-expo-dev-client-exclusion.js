const { withPodfile } = require('expo/config-plugins')
const { getAppVariant, getPodfileUseExpoModulesLine } = require('../config/appVariant')

module.exports = function withExpoDevClientExclusion(config) {
  return withPodfile(config, (config) => {
    const appVariant = getAppVariant(config.extra?.appVariant ?? process.env.APP_VARIANT ?? 'dev')
    const useExpoModulesLine = getPodfileUseExpoModulesLine(appVariant)

    config.modResults.contents = config.modResults.contents.replace(
      /^  use_expo_modules!(?:\(exclude: \[[^\]]*\]\))?\s*$/m,
      useExpoModulesLine,
    )

    return config
  })
}
