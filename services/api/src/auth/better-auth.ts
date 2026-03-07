import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { expo } from '@better-auth/expo';
import { passkey } from '@better-auth/passkey';
import { db } from '@hominem/db';
import type { BetterAuthOptions } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';
import { betterAuth } from 'better-auth';
import {
  bearer,
  captcha,
  deviceAuthorization,
  emailOTP,
  jwt,
  multiSession,
  openAPI,
  oneTimeToken,
} from 'better-auth/plugins';

import { env } from '../env';
import { sendEmail } from '../lib/email';
import { recordTestOtp } from './test-otp-store';

function getTrustedOrigins() {
  const origins = new Set([
    env.BETTER_AUTH_URL,
    env.FINANCE_URL,
    env.NOTES_URL,
    env.ROCCO_URL,
    'http://localhost:4444',
    'http://localhost:4445',
    'http://localhost:4446',
    'hakumi://',
    'hakumi-dev://',
    'hakumi-e2e://',
    'hakumi-preview://',
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
    database: {
      generateId: 'uuid' as const,
    },
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

function getAuthPlugins() {
  const plugins: BetterAuthPlugin[] = [
    expo(),
    passkey({
      rpID: new URL(env.BETTER_AUTH_URL).hostname,
      rpName: 'Hominem',
      origin: [
        env.BETTER_AUTH_URL,
        env.FINANCE_URL,
        env.NOTES_URL,
        env.ROCCO_URL,
        'http://localhost:4444',
        'http://localhost:4445',
        'http://localhost:4446',
      ],
      schema: {
        passkey: {
          modelName: 'userPasskey',
        },
      },
    }),
    emailOTP({
      expiresIn: env.AUTH_EMAIL_OTP_EXPIRES_SECONDS,
      sendVerificationOTP: async ({ email, otp, type }) => {
        recordTestOtp({ email, otp, type });
        if (env.NODE_ENV === 'test' && !env.RESEND_FROM_EMAIL) {
          return;
        }

        const subject =
          type === 'sign-in'
            ? 'Your sign-in code'
            : type === 'email-verification'
              ? 'Verify your email'
              : type === 'forget-password'
                ? 'Reset your password'
                : 'Your verification code';

        const text = `Your verification code is: ${otp}. This code will expire in 5 minutes.`;

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Hominem</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Your verification code is:</p>
    <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
      ${otp}
    </div>
    <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
    <p style="color: #666; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
  </div>
</body>
</html>`;

        await sendEmail({
          to: email,
          subject,
          text,
          html,
        });
      },
    }),
    jwt({
      schema: {
        jwks: {
          modelName: 'userJwks',
        },
      },
    }),
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
          modelName: 'userDeviceCode',
        },
      },
    }),
    // API key authentication is not currently available as a built-in plugin in better-auth@1.4.19
    // The database schema (better_auth_api_key table) is prepared for future support.
    // TODO: When better-auth adds native apiKey support, uncomment and configure below:
    // apiKey({
    //   defaultPrefix: 'hmn_',
    //   requireName: true,
    //   enableMetadata: true,
    //   schema: {
    //     apikey: {
    //       modelName: 'betterAuthApiKey',
    //     },
    //   },
    //   keyExpiration: {
    //     defaultExpiresIn: 1000 * 60 * 60 * 24 * 90,
    //     minExpiresIn: 1,
    //     maxExpiresIn: 365,
    //   },
    //   rateLimit: {
    //     enabled: true,
    //     timeWindow: 1000 * 60 * 60,
    //     maxRequests: 5000,
    //   },
    // }),
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
    modelName: 'authUser',
  },
  session: {
    modelName: 'userSession',
  },
  account: {
    modelName: 'userAccount',
  },
  verification: {
    modelName: 'userVerification',
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: getAuthPlugins(),
};

export const betterAuthServer = betterAuth({
  ...betterAuthOptions,
  database: kyselyAdapter(db),
});
