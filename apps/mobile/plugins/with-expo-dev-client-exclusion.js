const { withPodfile } = require('expo/config-plugins')

const e2eExcludedModules = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
]

module.exports = function withExpoDevClientExclusion(config) {
  return withPodfile(config, (config) => {
    const appVariant = config.extra?.appVariant ?? process.env.APP_VARIANT ?? 'dev'
    const exclusionLine =
      appVariant === 'e2e'
        ? `  use_expo_modules!(exclude: ${JSON.stringify(e2eExcludedModules)})`
        : '  use_expo_modules!'

    config.modResults.contents = config.modResults.contents.replace(
      /^  use_expo_modules!\s*$/m,
      exclusionLine,
    )

    return config
  })
}
