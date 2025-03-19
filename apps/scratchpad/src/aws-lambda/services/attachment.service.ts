import { openai } from '@ai-sdk/openai'
import { logger } from '@ponti/utils/logger'
import { generateObject } from 'ai'
import type { Attachment } from 'mailparser'
import { getAttachmentText } from '../process-email-attachment'
import { SubmissionAttachmentSchema, type SubmissionAttachment } from '../writer.schema'

export async function processAttachments(
  attachments: Attachment[],
  candidateNames: string[]
): Promise<SubmissionAttachment[]> {
  logger.info('Starting attachment processing', {
    attachmentCount: attachments.length,
    candidateCount: candidateNames.length,
  })
  const results: SubmissionAttachment[] = []

  for (const attachment of attachments.slice(0, 1)) {
    const filename = attachment.filename || 'attachment'
    logger.info('Processing single attachment', {
      filename,
      contentType: attachment.contentType,
      size: attachment.size,
    })

    try {
      logger.debug('Extracting text from attachment', { filename })
      const content = await getAttachmentText(attachment)

      if (!content.text) {
        logger.warn('Empty attachment content', { filename })
        continue
      }

      logger.info('Generating object from content', {
        filename,
        pageCount: content.pages,
        textLength: content.text.length,
      })

      const response = await generateObject({
        model: openai('gpt-4o-mini', { structuredOutputs: true }),
        messages: [
          {
            role: 'system',
            content: `
              Based on the following text chunk from an attachment, extract any relevant information that could be added to the writer's profile.
              Focus on additional notable works, awards, or background information.

              The document is ${content.pages} pages long.
              The attachment belongs to one of these candidates: ${candidateNames}
            `,
          },
          {
            role: 'user',
            content: content.text,
          },
        ],
        schema: SubmissionAttachmentSchema,
      })

      logger.debug('Generated object from content', {
        filename,
        responseType: typeof response,
        hasObject: !!response.object,
      })

      logger.info('Rate limiting pause', { filename })
      await new Promise((resolve) => setTimeout(resolve, 30000))

      results.push(response.object)
    } catch (error) {
      logger.error('Attachment processing error', {
        filename,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace available',
      })
      throw error
    }
  }

  logger.info('Completed attachment processing', {
    processedCount: results.length,
    totalAttachments: attachments.length,
  })
  return results
}
