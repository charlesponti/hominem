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

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<void> {
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
