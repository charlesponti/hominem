import 'dotenv/config'

import { logger } from '@ponti/utils/logger'
import { ZodError } from 'zod'
import { processAttachments } from './services/attachment.service'
import { parseEmail, processEmailBody, validateEmailBody } from './services/email.service'
import type { Candidates, SubmissionAttachment } from './writer.schema'

export interface LambdaEvent {
  Records: [
    {
      ses: {
        mail: {
          content: string
        }
      }
    },
  ]
}

export function mergeWriterData(writerData: Candidates, attachmentResults: SubmissionAttachment[]) {
  logger.info('Starting mergeWriterData', {
    writerCount: writerData.candidates.length,
    attachmentCount: attachmentResults.length,
  })
  const results = []

  for (const writer of writerData.candidates) {
    logger.debug('Processing writer', { writerName: writer.name })
    for (const attachment of attachmentResults) {
      if (writer.name === attachment.candidateName) {
        logger.debug('Found matching attachment', { writerName: writer.name })
        results.push({ ...writer, ...attachment })
      }
    }
  }

  logger.info('Completed mergeWriterData', { resultCount: results.length })
  return results
}

export const handler = async (event: LambdaEvent) => {
  try {
    logger.info('Starting Lambda handler', { eventRecords: event.Records.length })

    logger.info('Starting email parsing...')
    const email = await parseEmail(event)
    logger.info('Email parsed successfully', { attachmentCount: email.attachments?.length })

    logger.info('Starting email body validation...')
    const emailBody = await validateEmailBody(email)
    logger.info('Email body validated successfully')

    logger.info('Starting email body processing...')
    const writerData = await processEmailBody(emailBody)
    logger.info('Email body processed successfully', {
      candidateCount: writerData.candidates.length,
    })

    logger.info('Starting attachment processing...')
    const candidateNames = writerData.candidates.map((c) => c.name)
    logger.debug('Processing attachments for candidates', { candidateNames })
    const attachmentResults = await processAttachments(email.attachments, candidateNames)
    logger.info('Attachments processed successfully', { resultCount: attachmentResults.length })

    const writerDataWithAttachments = mergeWriterData(writerData, attachmentResults)
    logger.info('Writer data merged with attachments', {
      finalResultCount: writerDataWithAttachments.length,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        writerDataWithAttachments,
      }),
    }
  } catch (error) {
    logger.error('Lambda handler error', { error })

    if (error instanceof ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid writer data format',
          details: error.errors,
        }),
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
