const EXPO_OWNER = 'pontistudios'
const EXPO_PROJECT_ID = '4dfac82b-644f-4ff3-be42-e8f941287aa1'
const EXPO_PROJECT_SLUG = 'hakumi'

const getEnvValue = (value, fallback) => value ?? fallback

function getExpoExtraConfig(env) {
  return {
    apiBaseUrl: getEnvValue(env.EXPO_PUBLIC_API_BASE_URL, ''),
    e2eTesting: getEnvValue(env.EXPO_PUBLIC_E2E_TESTING, 'false'),
    e2eAuthSecret: getEnvValue(env.EXPO_PUBLIC_E2E_AUTH_SECRET, ''),
    mobilePasskeyEnabled: getEnvValue(env.EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED, 'false'),
  }
}

module.exports = {
  EXPO_OWNER,
  EXPO_PROJECT_ID,
  EXPO_PROJECT_SLUG,
  getExpoExtraConfig,
}
