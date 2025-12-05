import sgMail from '@sendgrid/mail'

type SendInviteEmailParams = {
  to: string
  listName: string
  inviteLink: string
  fromEmail?: string
}

function getApiKey(): string {
  const key = process.env.SENDGRID_API_KEY
  if (!key) {
    throw new Error('SENDGRID_API_KEY is not set')
  }
  return key
}

function getFromEmail(): string {
  const from = process.env.INVITE_FROM_EMAIL
  if (!from) {
    throw new Error('INVITE_FROM_EMAIL is not set')
  }
  return from
}

export async function sendInviteEmail({
  to,
  listName,
  inviteLink,
  fromEmail,
}: SendInviteEmailParams): Promise<void> {
  sgMail.setApiKey(getApiKey())

  const from = fromEmail ?? getFromEmail()
  const subject = `You've been invited to collaborate on "${listName}"`

  const text = [
    `You've been invited to collaborate on "${listName}".`,
    `Open this link to accept: ${inviteLink}`,
  ].join('\n')

  const html = `<p>You've been invited to collaborate on <strong>${listName}</strong>.</p><p><a href="${inviteLink}" target="_blank" rel="noopener noreferrer">Accept your invite</a></p>`

  await sgMail.send({
    to,
    from,
    subject,
    text,
    html,
  })
}
