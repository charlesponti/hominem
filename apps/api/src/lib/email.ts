import { logger } from '@hominem/utils/logger'
import sendgrid, { type MailDataRequired } from '@sendgrid/mail'
import { env } from './env.js'

const isDev = env.NODE_ENV === 'development'

// Initialize SendGrid
function initializeEmailService() {
  if (!env.SENDGRID_API_KEY) {
    logger.error('The SENDGRID_API_KEY env var must be set, otherwise the API cannot send emails.')
    process.exit(1)
  }

  // Set SendGrid API key
  sendgrid.setApiKey(env.SENDGRID_API_KEY)
}

// Initialize on module load
initializeEmailService()

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

/**
 * Email service for sending emails via SendGrid
 */
export const emailService = {
  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const msg: MailDataRequired = {
      to: options.to,
      from: options.from || {
        email: env.SENDGRID_SENDER_EMAIL,
        name: env.SENDGRID_SENDER_NAME,
      },
      subject: options.subject,
      text: options.text,
      html: options.html,
    }

    // Only send an email in prod. Log in development to not waste SendGrid email quota.
    if (isDev) {
      logger.info(`Email sent to: ${options.to}: ${options.text}`)
    } else {
      try {
        await sendgrid.send(msg)
        logger.info('Email sent', {
          receiver: options.to,
          sender: env.SENDGRID_SENDER_EMAIL,
        })
      } catch (err) {
        logger.error({ err, ...options }, 'Error sending email')
        throw new Error('Error sending email')
      }
    }
  },

  /**
   * Send an authentication token email
   */
  async sendEmailToken(email: string, token: string): Promise<void> {
    const msg: MailDataRequired = {
      to: email,
      from: {
        email: env.SENDGRID_SENDER_EMAIL,
        name: env.SENDGRID_SENDER_NAME,
      },
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
    }

    // Log the email token in development to not expend SendGrid email quota
    if (isDev) {
      logger.info(`Email token for ${email}: ${token}`)
      return
    }

    try {
      await sendgrid.send(msg)
      logger.info(`sending email token to ${email} from ${env.SENDGRID_SENDER_EMAIL}`)
    } catch (err) {
      logger.error({ err, email, token }, 'Error sending email token')
      throw new Error('Error sending email')
    }
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
