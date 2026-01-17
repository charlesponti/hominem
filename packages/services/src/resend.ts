import { Resend } from 'resend'
import { env } from './env'

type SendInviteEmailParams = {
  to: string
  listName: string
  inviteLink: string
  fromEmail?: string
}

function getApiKey(): string {
  const key = env.RESEND_API_KEY
  if (!key) {
    throw new Error('RESEND_API_KEY is not set')
  }
  return key
}

function getFromEmail(): string {
  const from = env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set')
  }
  return from
}

function formatFrom(fromEmail: string): string {
  const name = env.RESEND_FROM_NAME
  return name ? `${name} <${fromEmail}>` : fromEmail
}

export async function sendInviteEmail({
  to,
  listName,
  inviteLink,
}: SendInviteEmailParams): Promise<void> {
  const resend = new Resend(getApiKey())
  const from = formatFrom(getFromEmail())
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

export async function sendAdminNotification({
  action,
  adminUser,
  updatedCount,
  duration,
  errors,
}: {
  action: string
  adminUser: string
  updatedCount: number
  duration: number
  errors?: unknown
}) {
  const resend = new Resend(getApiKey())
  const subject = `[Admin Action Completed] ${action}`
  const body = `Action: ${action}\nTriggered by: ${adminUser}\nUpdated count: ${updatedCount}\nDuration: ${duration}ms\nErrors: ${errors ? JSON.stringify(errors) : 'None'}\nTimestamp: ${new Date().toISOString()}`
  const email = formatFrom(getFromEmail())

  await resend.emails.send({
    from: email,
    to: email,
    subject,
    text: body,
  })
}
