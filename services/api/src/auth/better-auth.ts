import { betterAuth } from 'better-auth'
import type { BetterAuthPlugin } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import {
  apiKey,
  bearer,
  captcha,
  deviceAuthorization,
  jwt,
  multiSession,
  openAPI,
  oneTimeToken,
} from 'better-auth/plugins'
import { passkey } from '@better-auth/passkey'

import { env } from '../env'

function getTrustedOrigins() {
  const origins = new Set([env.BETTER_AUTH_URL, env.FINANCE_URL, env.NOTES_URL, env.ROCCO_URL])
  return [...origins]
}

function getAdvancedOptions() {
  const cookieDomain = env.AUTH_COOKIE_DOMAIN.trim()
  const crossSubDomainEnabled = cookieDomain.length > 0
  const useSecureCookies =
    env.NODE_ENV === 'production' || new URL(env.BETTER_AUTH_URL).protocol === 'https:'

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
  }
}

function getSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {}

  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
    providers.apple = {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
    }
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }
  }

  return providers
}

function getAuthPlugins() {
  const plugins: BetterAuthPlugin[] = [
    passkey({
      rpID: new URL(env.BETTER_AUTH_URL).hostname,
      rpName: 'Hominem',
      origin: [env.BETTER_AUTH_URL, env.FINANCE_URL, env.NOTES_URL, env.ROCCO_URL],
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
    }),
    apiKey({
      defaultPrefix: 'hmn_',
      requireName: true,
      enableMetadata: true,
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
  ]

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
    }) as BetterAuthPlugin
    plugins.push(captchaPlugin)
  }

  return plugins
}

/**
 * Phase-1 bootstrap instance.
 *
 * Runtime is intentionally backed by memory storage while we finalize
 * production Drizzle schemas and migration cutover.
 */
export const betterAuthServer = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  advanced: getAdvancedOptions(),
  database: memoryAdapter({}),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: getSocialProviders(),
  plugins: getAuthPlugins(),
})
