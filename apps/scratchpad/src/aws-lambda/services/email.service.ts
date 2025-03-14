import { openai } from '@ai-sdk/openai'
import { logger } from '@ponti/utils'
import { generateObject } from 'ai'
import { simpleParser, type ParsedMail } from 'mailparser'
import type { LambdaEvent } from '../prolog-email-lambda'
import { CandidatesSchema, type Candidates } from '../writer.schema'

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

export async function processEmailBody(emailBody: string): Promise<Candidates> {
  logger.info('Processing email body', {
    bodyLength: emailBody.length,
  })
  try {
    const response = await generateObject({
      model: openai('gpt-4o', { structuredOutputs: true }),
      messages: [
        {
          role: 'user',
          content: `Analyze the following email and retrieve all the writers mentioned:\n\n${emailBody}`,
        },
      ],
      schema: CandidatesSchema,
    })

    logger.info('Email body processed successfully', {
      candidateCount: response.object.candidates?.length,
    })
    return response.object
  } catch (error) {
    logger.error('Email body processing error', { error })
    throw error
  }
}
