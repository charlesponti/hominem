import { logger } from '@ponti/utils/logger'
import { simpleParser, type ParsedMail } from 'mailparser'
import type { LambdaEvent } from '../smart-input/smart-input-lambda'

export async function parseEmail(event: LambdaEvent): Promise<ParsedMail> {
  logger.info('Starting email parsing', {
    contentLength: event.Records[0].ses.mail.content.length,
  })
  try {
    const parsedEmail = await simpleParser(event.Records[0].ses.mail.content)
    logger.info('Email parsed successfully', {
      hasAttachments: !!parsedEmail.attachments,
      attachmentCount: parsedEmail.attachments?.length,
      hasText: !!parsedEmail.text,
      textLength: parsedEmail.text?.length,
    })
    return parsedEmail
  } catch (error) {
    logger.error('Email parsing error', { error })
    throw error
  }
}

export async function validateEmailBody(email: ParsedMail): Promise<string> {
  logger.debug('Validating email body', {
    hasText: !!email.text,
    textLength: email.text?.length,
  })
  if (!email.text) {
    logger.error('Email validation failed: No body found')
    throw new Error('No email body found')
  }
  logger.info('Email body validated successfully')
  return email.text
}
