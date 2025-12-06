import { Resend } from 'resend'

type SendInviteEmailParams = {
  to: string
  listName: string
  inviteLink: string
  fromEmail?: string
}

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return key
}

function getFromEmail(): string {
  const from = process.env.SENDGRID_SENDER_EMAIL || process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error('SENDGRID_SENDER_EMAIL (or RESEND_FROM_EMAIL) is not set')
  }
  return from
}

function formatFrom(fromEmail: string): string {
  const name = process.env.SENDGRID_SENDER_NAME
  return name ? `${name} <${fromEmail}>` : fromEmail
}

export async function sendInviteEmail({
  to,
  listName,
  inviteLink,
  fromEmail,
}: SendInviteEmailParams): Promise<void> {
  const resend = new Resend(getApiKey())

  const from = formatFrom(fromEmail ?? getFromEmail())
  const subject = `You've been invited to collaborate on "${listName}"`

  const text = [
    `You've been invited to collaborate on "${listName}".`,
    `Open this link to accept: ${inviteLink}`,
  ].join('\n')

  const html = `<p>You've been invited to collaborate on <strong>${listName}</strong>.</p><p><a href="${inviteLink}" target="_blank" rel="noopener noreferrer">Accept your invite</a></p>`

  await resend.emails.send({
    to,
    from,
    subject,
    text,
    html,
  })
}
