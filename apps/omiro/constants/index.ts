import { BRAND } from '@hominem/env/brand';
import Constants from 'expo-constants';

import { env, parseAppEnvironment } from '~/env';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  appEnvironment?: string;
  appScheme?: string;
};

const appEnvironment = parseAppEnvironment(extra.appEnvironment ?? process.env.APP_ENV);
const releaseChannel = appEnvironment === 'production' ? appEnvironment : null;

export const E2E_TESTING = appEnvironment === 'e2e';

export const API_BASE_URL = env.EXPO_PUBLIC_API_BASE_URL;
export const APP_ENV = appEnvironment;
export const APP_SCHEME = extra.appScheme || 'hakumi';
export const APP_NAME = BRAND.appName;
export const RELEASE_CHANNEL = releaseChannel;
