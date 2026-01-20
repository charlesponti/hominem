import { logger } from '@hominem/utils/logger';
import { type ParsedMail, simpleParser } from 'mailparser';

export async function parseEmail(rawEmail: string): Promise<ParsedMail> {
  logger.info('Starting email parsing', {
    contentLength: rawEmail.length,
  });
  try {
    const parsedEmail = await simpleParser(rawEmail);
    logger.info('Email parsed successfully', {
      hasAttachments: !!parsedEmail.attachments,
      attachmentCount: parsedEmail.attachments?.length,
      hasText: !!parsedEmail.text,
      textLength: parsedEmail.text?.length,
    });
    return parsedEmail;
  } catch (error) {
    logger.error('Email parsing error', { error });
    throw error;
  }
}

export async function validateEmailBody(email: ParsedMail): Promise<string> {
  logger.debug('Validating email body', {
    hasText: !!email.text,
    textLength: email.text?.length,
  });
  if (!email.text) {
    logger.error('Email validation failed: No body found');
    throw new Error('No email body found');
  }
  logger.info('Email body validated successfully');
  return email.text;
}
