import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  aiSdkChatWebEnabled?: string;
  aiSdkChatMobileEnabled?: string;
  aiSdkTranscribeEnabled?: string;
  aiSdkSpeechEnabled?: string;
  mobilePasskeyEnabled?: string;
  e2eTesting?: string;
  e2eAuthSecret?: string;
  appVariant?: string;
  appScheme?: string;
};

const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
const localHost = hostUri ? hostUri.split(':').shift() : null;

function toDeviceReachableApiBaseUrl(baseUrl: string, host: string | null) {
  if (!baseUrl || !host) {
    return baseUrl;
  }

  try {
    const parsed = new URL(baseUrl);
    const isLocalHost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1';
    if (!isLocalHost) {
      return baseUrl;
    }

    parsed.hostname = host;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return baseUrl;
  }
}

const configuredApiBaseUrlRaw = extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || '';
const configuredApiBaseUrl = toDeviceReachableApiBaseUrl(
  configuredApiBaseUrlRaw,
  localHost ?? null,
);
const fallbackApiBaseUrl = localHost ? `http://${localHost}:3000` : 'http://localhost:3000';
const appVariant = extra.appVariant ?? process.env.APP_VARIANT ?? 'dev';
const isProductionRuntime = appVariant === 'production';

if (!configuredApiBaseUrl && isProductionRuntime) {
  throw new Error(
    'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL in mobile runtime configuration.',
  );
}

export const API_BASE_URL = configuredApiBaseUrl || fallbackApiBaseUrl;
export const APP_VARIANT = appVariant;
export const APP_SCHEME = extra.appScheme || 'hakumi';

const toBooleanFlag = (value: string | undefined) => value === 'true';

export const AI_SDK_CHAT_MOBILE_ENABLED = toBooleanFlag(
  extra.aiSdkChatMobileEnabled || process.env.EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED,
);

export const MOBILE_PASSKEY_ENABLED = toBooleanFlag(
  extra.mobilePasskeyEnabled || process.env.EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED,
);

export const E2E_TESTING = toBooleanFlag(extra.e2eTesting || process.env.EXPO_PUBLIC_E2E_TESTING);

export const E2E_AUTH_SECRET = extra.e2eAuthSecret || process.env.EXPO_PUBLIC_E2E_AUTH_SECRET || '';
