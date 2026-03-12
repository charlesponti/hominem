import { expo } from '@better-auth/expo';
import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { passkey } from '@better-auth/passkey';
import { db } from '@hominem/db';
import { logger } from '@hominem/utils/logger';
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

const userFieldMappings = {
  emailVerified: 'email_verified',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const sessionFieldMappings = {
  expiresAt: 'expires_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',
  userId: 'user_id',
};

const accountFieldMappings = {
  accountId: 'account_id',
  providerId: 'provider_id',
  userId: 'user_id',
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  idToken: 'id_token',
  accessTokenExpiresAt: 'access_token_expires_at',
  refreshTokenExpiresAt: 'refresh_token_expires_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const verificationFieldMappings = {
  expiresAt: 'expires_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const passkeyFieldMappings = {
  publicKey: 'public_key',
  userId: 'user_id',
  credentialID: 'credential_id',
  deviceType: 'device_type',
  backedUp: 'backed_up',
  createdAt: 'created_at',
};

const jwksFieldMappings = {
  publicKey: 'public_key',
  privateKey: 'private_key',
  createdAt: 'created_at',
  expiresAt: 'expires_at',
};

const deviceCodeFieldMappings = {
  deviceCode: 'device_code',
  userCode: 'user_code',
  userId: 'user_id',
  expiresAt: 'expires_at',
  lastPolledAt: 'last_polled_at',
  pollingInterval: 'polling_interval',
  clientId: 'client_id',
};

function getTrustedOrigins() {
  const origins = new Set([
    env.API_URL,
    env.AUTH_PASSKEY_ORIGIN,
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
    env.NODE_ENV === 'production' || new URL(env.API_URL).protocol === 'https:';

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
      rpID: env.AUTH_PASSKEY_RP_ID,
      rpName: 'Hominem',
      origin: getTrustedOrigins(),
      schema: {
        passkey: {
          modelName: 'user_passkey',
          fields: passkeyFieldMappings,
        },
      },
    }),
    emailOTP({
      expiresIn: env.AUTH_EMAIL_OTP_EXPIRES_SECONDS,
      sendVerificationOTP: async ({ email, otp, type }) => {
        recordTestOtp({ email, otp, type });

        // In development mode we want to see OTPs in the server logs so
        // engineers can sign in without waiting for an email.  This uses
        // the shared pino logger that's already used across the API.  We
        // also bypass the real email send because the nodemailer transport
        // isn't configured in local dev and the test harness doesn't need it.
        if (env.NODE_ENV === 'development') {
          logger.info('[auth:email-otp] generated OTP', { email, otp, type });
          return;
        }

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
          modelName: 'user_jwks',
          fields: jwksFieldMappings,
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
          modelName: 'user_device_code',
          fields: deviceCodeFieldMappings,
        },
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
  baseURL: env.API_URL,
  trustedOrigins: getTrustedOrigins(),
  advanced: getAdvancedOptions(),
  user: {
    modelName: 'users',
    fields: userFieldMappings,
  },
  session: {
    modelName: 'user_session',
    fields: sessionFieldMappings,
  },
  account: {
    modelName: 'user_account',
    fields: accountFieldMappings,
  },
  verification: {
    modelName: 'user_verification',
    fields: verificationFieldMappings,
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
