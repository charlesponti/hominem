import { openai } from '@ai-sdk/openai'
import { logger } from '@hominem/utils/logger'
import { generateObject, generateText } from 'ai'
import type { Attachment } from 'mailparser'
import type { Result as PDFParseResult } from 'pdf-parse'
import { SubmissionAttachmentSchema, type SubmissionAttachment } from '../../lib/writer.schema'

const pdfParse = require('pdf-parse')

const CHUNK_SIZE = 4096

export function splitIntoChunks(content: string): string[] {
  const chunks: string[] = []
  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE))
  }
  return chunks
}

export async function getPDFData(content: Buffer): Promise<PDFParseResult> {
  const pdfData = await pdfParse(content)
  return pdfData
}

export async function getAttachmentText(
  attachment: Attachment
): Promise<{ text: string; pages: number }> {
  const { content } = attachment
  if (!content) {
    return { text: '', pages: 0 }
  }

  if (attachment.contentType === 'application/pdf') {
    const pdfData = await getPDFData(content)
    return { text: pdfData.text, pages: pdfData.numpages }
  }

  return { text: content.toString('utf-8'), pages: 1 }
}

export async function processAttachment(attachment: Attachment): Promise<string | null> {
  const { filename } = attachment
  if (!filename || !attachment.content) {
    return null
  }

  try {
    const content = await getAttachmentText(attachment)

    const { response } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `
            Based on the following text chunk from an attachment, extract any relevant information that could be added to the writer's profile. 
            Focus on additional notable works, awards, or background information.
          `,
        },
        {
          role: 'user',
          content: content.text,
        },
      ],
    })

    const result = response.messages[0]?.content as string

    return result
  } catch (error) {
    logger.error(`Error processing attachment: ${filename}`)
    throw error
  }
}

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
