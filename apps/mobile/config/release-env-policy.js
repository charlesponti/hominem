const LOCAL_ENV_VARIANTS = new Set(['dev', 'e2e'])
const RELEASE_ENV_VARIANTS = new Set(['preview', 'production'])
const REQUIRED_RELEASE_ENV_VARS = ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_POSTHOG_API_KEY']

function canUseLocalEnvFile(variant) {
  return LOCAL_ENV_VARIANTS.has(variant)
}

function isReleaseVariant(variant) {
  return RELEASE_ENV_VARIANTS.has(variant)
}

function assertReleaseEnv(variant, env) {
  if (!isReleaseVariant(variant)) {
    return
  }

  for (const name of REQUIRED_RELEASE_ENV_VARS) {
    if (!env[name]) {
      throw new Error(`Missing release env var ${name} for ${variant}`)
    }
  }
}

module.exports = {
  assertReleaseEnv,
  canUseLocalEnvFile,
  isReleaseVariant,
}
