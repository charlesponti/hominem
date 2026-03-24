import { BRAND } from '@hominem/env/brand';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  mobilePasskeyEnabled?: string;
  e2eTesting?: string;
  e2eAuthSecret?: string;
  appVariant?: string;
  appScheme?: string;
};

const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
const localHost = hostUri ? hostUri.split(':').shift() : null;

function toDeviceReachableApiBaseUrl(
  baseUrl: string,
  host: string | null,
  isPhysicalDevice: boolean,
) {
  if (!baseUrl || !host || !isPhysicalDevice) {
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
  Device.isDevice,
);
const fallbackApiBaseUrl =
  localHost && Device.isDevice ? `http://${localHost}:4040` : 'http://localhost:4040';
const appVariant = extra.appVariant ?? process.env.APP_VARIANT ?? 'dev';
export function isReleaseAppVariant(variant: string) {
  return variant === 'preview' || variant === 'production';
}

const isReleaseRuntime = isReleaseAppVariant(appVariant);

if (!configuredApiBaseUrl && isReleaseRuntime) {
  throw new Error(
    `Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL in mobile runtime configuration for ${appVariant}.`,
  );
}

export const API_BASE_URL = configuredApiBaseUrl || fallbackApiBaseUrl;
export const APP_VARIANT = appVariant;
export const APP_SCHEME = extra.appScheme || 'hakumi';
export const APP_NAME = BRAND.appName;

const toBooleanFlag = (value: string | undefined) => value === 'true';

export const MOBILE_PASSKEY_ENABLED = toBooleanFlag(
  extra.mobilePasskeyEnabled || process.env.EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED,
);

export const E2E_TESTING = toBooleanFlag(extra.e2eTesting || process.env.EXPO_PUBLIC_E2E_TESTING);

export const E2E_AUTH_SECRET = extra.e2eAuthSecret || process.env.EXPO_PUBLIC_E2E_AUTH_SECRET || '';
