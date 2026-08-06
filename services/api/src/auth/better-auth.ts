import { createHash, randomInt } from 'node:crypto';

import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { authDb } from '@hominem/db';
import { logger } from '@hominem/telemetry';
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { betterAuth } from 'better-auth';
import { emailOTP, mcp, multiSession, openAPI } from 'better-auth/plugins';

import { API_BRAND } from '../brand';
import { env } from '../env';
import { MCP_SCOPES } from '../scopes';
import { enableTestOtpStore, recordTestOtp } from './test-otp-store';

// Enable the test OTP store in non-production environments
if (env.NODE_ENV !== 'production') {
  enableTestOtpStore();
}

export function getTrustedOrigins() {
  const origins = new Set([
    env.API_URL,
    env.CAREER_URL,
    env.FINANCE_URL,
    env.WEB_URL,
    env.LABS_URL,
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

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type VerificationOtpType = 'sign-in' | 'email-verification' | 'forget-password' | string;

type BetterAuthServer = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (input: {
      headers: Headers;
    }) => Promise<typeof inferredBetterAuthServer.$Infer.Session | null>;
  };
};

const verificationOtpSubjectByType = {
  'sign-in': 'Your sign-in code',
  'email-verification': 'Verify your email',
  'forget-password': 'Reset your password',
} as const satisfies Record<string, string>;

export const TEST_OTP = '000000';

function generateNumericOtp({ length, isTest }: { length: number; isTest?: boolean }): string {
  if (isTest) return TEST_OTP;
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
}

function shouldSendEmails(): boolean {
  if (env.SEND_EMAILS === 'true') return true;
  if (env.NODE_ENV === 'test') return false;
  if (env.NODE_ENV === 'development') return false;
  if (env.NODE_ENV === 'production') return true;
  return false;
}

// A stable, non-PII identifier for correlating log lines about the same
// recipient without writing raw email addresses to logs. The logger's
// redaction matches key names containing "email" (substring, case
// insensitive) — so the field names here must avoid that substring too,
// not just avoid holding a raw address, or they get redacted into
// uselessness the same way a raw `email` field would.
function emailLogContext(email: string): { recipientHash: string; recipientDomain: string } {
  return {
    recipientHash: createHash('sha256').update(email).digest('hex').slice(0, 12),
    recipientDomain: email.split('@')[1] ?? 'unknown',
  };
}

async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  if (!shouldSendEmails()) {
    logger.info('email_skipped', { ...emailLogContext(to), subject });
    return;
  }

  const from = env.RESEND_FROM_NAME
    ? `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`
    : env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);

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
  return (verificationOtpSubjectByType as Record<string, string>)[type] ?? 'Your verification code';
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

function getAuthPlugins() {
  const plugins: BetterAuthPlugin[] = [
    emailOTP({
      expiresIn: env.AUTH_EMAIL_OTP_EXPIRES_SECONDS,
      generateOTP: () => generateNumericOtp({ length: 6, isTest: !shouldSendEmails() }),
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (env.NODE_ENV !== 'production') {
          logger.info('[auth:email-otp] routed to test OTP store, not sent', {
            ...emailLogContext(email),
            type,
            nodeEnv: env.NODE_ENV,
          });
          enableTestOtpStore();
          recordTestOtp(email, otp, type);
          return;
        }

        try {
          await sendEmail(buildVerificationOtpEmail({ to: email, otp, type }));
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
    mcp({
      loginPage: new URL('/login', env.API_URL).toString(),
      resource: new URL('/api/mcp', env.API_URL).toString(),
      oidcConfig: {
        loginPage: new URL('/login', env.API_URL).toString(),
        scopes: [...MCP_SCOPES],
        metadata: {
          scopes_supported: ['openid', 'profile', 'email', 'offline_access', ...MCP_SCOPES],
        },
      },
    }),
    multiSession({ maximumSessions: 8 }),
    openAPI({
      path: '/reference',
      theme: 'deepSpace',
    }),
  ];

  return plugins;
}

// Email OTP is the product auth surface. Password auth, device
// authorization, JWT/JWKS, and one-time tokens are intentionally disabled until
// a concrete client needs them (see kernel-better-auth surface map).
const betterAuthOptions: BetterAuthOptions = {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.API_URL,
  trustedOrigins: getTrustedOrigins(),
  advanced: getAdvancedOptions(),
  emailAndPassword: {
    enabled: false,
  },
  session: {
    freshAge: 60 * 60 * 24, // 24 hours
  },
  plugins: getAuthPlugins(),
};

const inferredBetterAuthServer = betterAuth({
  ...betterAuthOptions,
  database: kyselyAdapter(authDb),
});

export const betterAuthServer: BetterAuthServer = inferredBetterAuthServer;

export const betterAuthMcpServer = betterAuthServer as BetterAuthServer & {
  api: BetterAuthServer['api'] & {
    getMcpSession: (input: {
      headers: Headers;
    }) => Promise<{ userId: string; scopes: string; clientId?: string } | null>;
    getMcpOAuthConfig: (...args: unknown[]) => unknown;
    getMCPProtectedResource: (...args: unknown[]) => unknown;
  };
};
