import { logger } from '@hominem/utils/logger'
import { Resend } from 'resend'
import { env } from './env.js'

const isDev = env.NODE_ENV === 'development'
const isTest = env.NODE_ENV === 'test'

if (!((env.RESEND_API_KEY || isDev ) || isTest)) {
  logger.error('The RESEND_API_KEY env var must be set, otherwise the API cannot send emails.')
  process.exit(1)
}

const resend = new Resend(env.RESEND_API_KEY || 'test-resend-key')

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html: string
  from?: {
    email: string
    name?: string
  }
}

export const emailService = {
  async sendEmail(options: EmailOptions): Promise<void> {
    const fromEmail = options.from?.email ?? env.RESEND_FROM_EMAIL
    const fromName = options.from?.name ?? env.RESEND_FROM_NAME
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

    // Only send an email in prod. Otherwise, log to not waste quota.
    if (isDev || isTest) {
      logger.info(`Email sent to: ${options.to}: ${options.text}`)
    } else {
      try {
        const result = await resend.emails.send({
          to: options.to,
          from,
          subject: options.subject,
          text: options.text,
          html: options.html,
        })

        if (result.error) {
          throw result.error
        }

        logger.info('Email sent', {
          receiver: options.to,
          sender: fromEmail,
        })
      } catch (err) {
        logger.error('Error sending email', { err, ...options })
        throw new Error('Error sending email')
      }
    }
  },

  /**
   * Send an authentication token email
   */
  async sendEmailToken(email: string, token: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your Ponti Studios login token',
      text: `The login token for the API is: ${token}`,
      html: `
        <div style="font-family: sans-serif;">
          <div style="display: flex; align-items: center; margin-bottom: 16px; padding: 16px 0;">
            <h1>Ponti Studios</h1>
          </div>
          <p>The login token for the API is: ${token}</p>
        </div>
      `,
    })
  },

  /**
   * Send a welcome email to new users
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Ponti Studios',
      text: `Welcome to Ponti Studios${name ? `, ${name}` : ''}! We're excited to have you on board.`,
      html: `
        <div style="font-family: sans-serif;">
          <div style="display: flex; align-items: center; margin-bottom: 16px; padding: 16px 0;">
            <h1>Ponti Studios</h1>
          </div>
          <p>Welcome to Ponti Studios${name ? `, ${name}` : ''}!</p>
          <p>We're excited to have you on board.</p>
        </div>
      `,
    })
  },

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Password Reset - Ponti Studios',
      text: `You requested a password reset. Your reset token is: ${resetToken}`,
      html: `
        <div style="font-family: sans-serif;">
          <div style="display: flex; align-items: center; margin-bottom: 16px; padding: 16px 0;">
            <h1>Ponti Studios</h1>
          </div>
          <p>You requested a password reset.</p>
          <p>Your reset token is: <strong>${resetToken}</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
      `,
    })
  },
}

// Export individual functions for backward compatibility
export const { sendEmail, sendEmailToken, sendWelcomeEmail, sendPasswordResetEmail } = emailService
