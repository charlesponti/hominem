import { logger } from '@hominem/utils/logger';

import { env } from '../env';

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getFromEmail(): string {
  const from = env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set');
  }
  return from;
}

function shouldSendEmails(): boolean {
  // Send emails if explicitly enabled via flag
  if (env.SEND_EMAILS === 'true') {
    return true;
  }

  // Don't send emails in test environment
  if (env.NODE_ENV === 'test') {
    return false;
  }

  // Don't send emails in development unless explicitly enabled
  if (env.NODE_ENV === 'development') {
    return false;
  }

  // Send emails in production by default
  if (env.NODE_ENV === 'production') {
    return true;
  }

  return false;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
  if (!shouldSendEmails()) {
    logger.info('email_skipped', { to, subject, nodeEnv: env.NODE_ENV });
    return;
  }

  const from = env.RESEND_FROM_NAME
    ? `${env.RESEND_FROM_NAME} <${getFromEmail()}>`
    : getFromEmail();

  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    to,
    from,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
