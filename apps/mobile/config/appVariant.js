const DEV_CLIENT_EXCLUDED_MODULES = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
]

const APP_VARIANTS = Object.freeze({
  dev: Object.freeze({
    bundleIdentifier: 'com.pontistudios.hakumi.dev',
    displayName: 'Hakumi Dev',
    scheme: 'hakumi-dev',
    usesDevClient: true,
    updatesChannel: null,
  }),
  e2e: Object.freeze({
    bundleIdentifier: 'com.pontistudios.hakumi.e2e',
    displayName: 'Hakumi E2E',
    scheme: 'hakumi-e2e',
    usesDevClient: false,
    updatesChannel: null,
  }),
  preview: Object.freeze({
    bundleIdentifier: 'com.pontistudios.hakumi.preview',
    displayName: 'Hakumi Preview',
    scheme: 'hakumi-preview',
    usesDevClient: false,
    updatesChannel: 'preview',
  }),
  production: Object.freeze({
    bundleIdentifier: 'com.pontistudios.hakumi',
    displayName: 'Hakumi',
    scheme: 'hakumi',
    usesDevClient: false,
    updatesChannel: 'production',
  }),
})

function getAppVariant(rawVariant = process.env.APP_VARIANT ?? 'dev') {
  if (Object.prototype.hasOwnProperty.call(APP_VARIANTS, rawVariant)) {
    return rawVariant
  }

  throw new Error(`Unsupported APP_VARIANT: ${rawVariant}`)
}

function getAppVariantConfig(rawVariant = process.env.APP_VARIANT ?? 'dev') {
  return APP_VARIANTS[getAppVariant(rawVariant)]
}

function getPodfileUseExpoModulesLine(rawVariant = process.env.APP_VARIANT ?? 'dev') {
  const variantConfig = getAppVariantConfig(rawVariant)

  if (variantConfig.usesDevClient) {
    return '  use_expo_modules!'
  }

  return `  use_expo_modules!(exclude: ${JSON.stringify(DEV_CLIENT_EXCLUDED_MODULES)})`
}

module.exports = {
  APP_VARIANTS,
  DEV_CLIENT_EXCLUDED_MODULES,
  getAppVariant,
  getAppVariantConfig,
  getPodfileUseExpoModulesLine,
}
