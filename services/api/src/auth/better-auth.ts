import type { BetterAuthOptions } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';

import { expo } from '@better-auth/expo';
import { passkey } from '@better-auth/passkey';
import { db } from '@hominem/db';
import * as schema from '@hominem/db/schema/tables';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  apiKey,
  bearer,
  captcha,
  deviceAuthorization,
  jwt,
  multiSession,
  openAPI,
  oneTimeToken,
} from 'better-auth/plugins';

import { env } from '../env';



function getTrustedOrigins() {
  const origins = new Set([
    env.BETTER_AUTH_URL,
    env.FINANCE_URL,
    env.NOTES_URL,
    env.ROCCO_URL,
    'hakumi://',
    'hakumi-dev://',
    'exp://',
  ]);
  return [...origins];
}

function getAdvancedOptions() {
  const cookieDomain = env.AUTH_COOKIE_DOMAIN.trim();
  const crossSubDomainEnabled = cookieDomain.length > 0;
  const useSecureCookies =
    env.NODE_ENV === 'production' || new URL(env.BETTER_AUTH_URL).protocol === 'https:';

  return {
    useSecureCookies,
    ...(crossSubDomainEnabled
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
            additionalCookies: ['session_token', 'session_data', 'dont_remember'],
          },
        }
      : {}),
    defaultCookieAttributes: {
      sameSite: 'lax' as const,
      httpOnly: true,
      secure: useSecureCookies,
    },
  };
}

function getSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};

  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
    };
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  return providers;
}

function getAuthPlugins() {
  const plugins: BetterAuthPlugin[] = [
    expo(),
    passkey({
      rpID: new URL(env.BETTER_AUTH_URL).hostname,
      rpName: 'Hominem',
      origin: [env.BETTER_AUTH_URL, env.FINANCE_URL, env.NOTES_URL, env.ROCCO_URL],
      schema: {
        passkey: {
          modelName: 'betterAuthPasskey',
        },
      },
    }),
    jwt(),
    bearer({ requireSignature: true }),
    multiSession({ maximumSessions: 8 }),
    oneTimeToken({
      expiresIn: 5,
      storeToken: 'hashed',
    }),
    deviceAuthorization({
      expiresIn: '10m',
      interval: '5s',
      schema: {
        deviceCode: {
          modelName: 'betterAuthDeviceCode',
        },
      },
    }),
    apiKey({
      defaultPrefix: 'hmn_',
      requireName: true,
      enableMetadata: true,
      schema: {
        apikey: {
          modelName: 'betterAuthApiKey',
        },
      },
      keyExpiration: {
        defaultExpiresIn: 1000 * 60 * 60 * 24 * 90,
        minExpiresIn: 1,
        maxExpiresIn: 365,
      },
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60 * 60,
        maxRequests: 5000,
      },
    }),
    openAPI({
      path: '/reference',
      theme: 'deepSpace',
    }),
  ];

  if (env.AUTH_CAPTCHA_SECRET_KEY) {
    const captchaPlugin = captcha({
      provider: env.AUTH_CAPTCHA_PROVIDER,
      secretKey: env.AUTH_CAPTCHA_SECRET_KEY,
      endpoints: [
        '/sign-in/social',
        '/sign-in/email',
        '/sign-up/email',
        '/passkey/verify-authentication',
        '/api-key/create',
      ],
    }) as BetterAuthPlugin;
    plugins.push(captchaPlugin);
  }

  return plugins;
}

const betterAuthOptions: BetterAuthOptions = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  advanced: getAdvancedOptions(),
  user: {
    modelName: 'betterAuthUser',
  },
  session: {
    modelName: 'betterAuthSession',
  },
  account: {
    modelName: 'betterAuthAccount',
  },
  verification: {
    modelName: 'betterAuthVerification',
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: getSocialProviders(),
  plugins: getAuthPlugins(),
};

export const betterAuthServer = betterAuth({
  ...betterAuthOptions,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
});
