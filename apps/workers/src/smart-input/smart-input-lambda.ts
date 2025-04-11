import 'dotenv/config'

import { openai } from '@ai-sdk/openai'
import { logger } from '@ponti/utils/logger'
import { generateObject } from 'ai'
import { ZodError } from 'zod'
import {
  CandidatesSchema,
  type Candidates,
  type SubmissionAttachment,
} from '../../lib/writer.schema'
import { parseEmail, validateEmailBody } from '../services/email.service'
import { processAttachments } from './smart-input-lambda.utils'

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
