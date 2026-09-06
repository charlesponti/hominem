import { createHash, randomInt } from 'node:crypto';

import { cimd } from '@better-auth/cimd';
import { fetchClientMetadataResource } from '@better-auth/cimd/node';
import { expo } from '@better-auth/expo';
import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { mcp } from '@better-auth/mcp';
import { authDb } from '@hominem/db/core';
import { logger } from '@hominem/telemetry';
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { betterAuth } from 'better-auth';
import { emailOTP, jwt, multiSession, openAPI } from 'better-auth/plugins';

import { activatePendingInvitesForUser } from '../application/collections.service';
import { API_BRAND } from '../brand';
import { env } from '../env';
import type { ApiEnv } from '../env.schema';
import { MCP_SCOPES } from '../scopes';

export function getTrustedOrigins(inputEnv = env) {
  const origins = new Set([
    inputEnv.API_URL,
    inputEnv.CAREER_URL,
    inputEnv.FINANCE_URL,
    inputEnv.WEB_URL,
    inputEnv.LABS_URL,
    ...(inputEnv.LABS_APEX_URL ? [inputEnv.LABS_APEX_URL] : []),
    inputEnv.WHAT_URL,
    'hakumi://',
    'hakumi-dev://',
    'hakumi-e2e://',
    'hakumi-preview://',
    'exp://',
  ]);
  return [...origins];
}

function getAdvancedOptions(inputEnv: ApiEnv) {
  const cookieDomain = inputEnv.AUTH_COOKIE_DOMAIN.trim();
  const crossSubDomainEnabled = cookieDomain.length > 0;
  const useSecureCookies =
    inputEnv.NODE_ENV === 'production' || new URL(inputEnv.API_URL).protocol === 'https:';

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

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type VerificationOtpType = 'sign-in' | 'email-verification' | 'forget-password' | string;

const verificationOtpSubjectByType: Record<VerificationOtpType, string> = {
  'sign-in': 'Your sign-in code',
  'email-verification': 'Verify your email',
  'forget-password': 'Reset your password',
};

const OTP_LENGTH = 6;

// Lets us tie log lines to the same recipient without logging a raw email.
// The logger auto-redacts any key with "email" in the name (case insensitive),
// so these field names have to dodge that substring too - not just avoid
// holding the raw address - otherwise they'd get redacted into mush anyway.
function emailLogContext(email: string): { recipientHash: string; recipientDomain: string } {
  return {
    recipientHash: createHash('sha256').update(email).digest('hex').slice(0, 12),
    recipientDomain: email.split('@')[1] ?? 'unknown',
  };
}

async function sendEmail(
  inputEnv: ApiEnv,
  { to, subject, text, html }: SendEmailParams,
): Promise<void> {
  const from = inputEnv.RESEND_FROM_NAME
    ? `${inputEnv.RESEND_FROM_NAME} <${inputEnv.RESEND_FROM_EMAIL}>`
    : inputEnv.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(inputEnv.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    to,
    from,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  if (error) {
    logger.error('[auth:email] resend rejected send', {
      ...emailLogContext(to),
      subject,
      from,
      errorName: error.name,
      errorMessage: error.message,
    });
    throw new Error(`Resend failed to send email: ${error.message}`);
  }

  logger.info('[auth:email] resend accepted send', {
    ...emailLogContext(to),
    subject,
    resendId: data?.id ?? null,
  });
}

function getVerificationOtpSubject(type: VerificationOtpType) {
  return verificationOtpSubjectByType[type] ?? 'Your verification code';
}

function buildVerificationOtpEmail(input: {
  to: string;
  otp: string;
  type: VerificationOtpType;
}): SendEmailParams {
  return {
    to: input.to,
    subject: getVerificationOtpSubject(input.type),
    text: `Your verification code is: ${input.otp}. This code will expire in 5 minutes.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${API_BRAND.appName}</h1>
  </div>
  <div style="padding: 30px; border: 1px solid; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Your verification code is:</p>
    <div style="padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border: 1px solid; border-radius: 8px; margin: 20px 0;">
      ${input.otp}
    </div>
    <p style="font-size: 14px;">This code will expire in 5 minutes.</p>
    <p style="font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
  };
}

function getAuthPlugins(inputEnv: ApiEnv) {
  const plugins: BetterAuthPlugin[] = [
    expo(),
    emailOTP({
      expiresIn: inputEnv.AUTH_EMAIL_OTP_EXPIRES_SECONDS,
      resendStrategy: 'reuse',
      generateOTP: () =>
        randomInt(0, 10 ** OTP_LENGTH)
          .toString()
          .padStart(OTP_LENGTH, '0'),
      sendVerificationOTP: async ({ email, otp, type }) => {
        try {
          await sendEmail(inputEnv, buildVerificationOtpEmail({ to: email, otp, type }));
        } catch (error) {
          logger.error('[auth:email-otp] failed to deliver verification email', {
            ...emailLogContext(email),
            type,
            error,
          });
          throw error;
        }
      },
    }),
    jwt(),
    mcp({
      loginPage: new URL('/login', inputEnv.API_URL).toString(),
      consentPage: new URL('/consent', inputEnv.API_URL).toString(),
      resource: new URL('/api/mcp', inputEnv.API_URL).toString(),
      scopes: ['openid', 'profile', 'email', 'offline_access', ...MCP_SCOPES],
      resources: [new URL('/api/mcp', inputEnv.API_URL).toString()],
      clientRegistrationDefaultResources: [new URL('/api/mcp', inputEnv.API_URL).toString()],
      clientRegistrationAllowedResources: [new URL('/api/mcp', inputEnv.API_URL).toString()],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: 'mcp-2026-07-28',
    }),
    multiSession({ maximumSessions: 8 }),
    openAPI({
      path: '/reference',
      theme: 'deepSpace',
    }),
  ];

  return plugins;
}

// Email OTP is the only auth surface we actually use. Password auth, device
// authorization, JWT/JWKS, and one-time tokens are turned off on purpose
// until something actually needs them.
export function createBetterAuthServer(inputEnv: ApiEnv) {
  const betterAuthOptions: BetterAuthOptions = {
    secret: inputEnv.BETTER_AUTH_SECRET,
    baseURL: inputEnv.API_URL,
    trustedOrigins: getTrustedOrigins(inputEnv),
    advanced: getAdvancedOptions(inputEnv),
    emailAndPassword: {
      enabled: false,
    },
    session: {
      freshAge: 60 * 60 * 24, // 24 hours
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    rateLimit: {
      storage: 'database',
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await activatePendingInvitesForUser(user.id, user.email);
          },
        },
      },
    },
    plugins: getAuthPlugins(inputEnv),
  };

  return betterAuth({
    ...betterAuthOptions,
    database: kyselyAdapter(authDb),
  });
}

export const betterAuthServer = createBetterAuthServer(env);
