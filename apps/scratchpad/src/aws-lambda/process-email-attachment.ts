import { openai } from '@ai-sdk/openai'
import { logger } from '@ponti/utils/logger'
import { generateText } from 'ai'
import type { Attachment } from 'mailparser'
import pdfParse from 'pdf-parse'

const CHUNK_SIZE = 4096

export function splitIntoChunks(content: string): string[] {
  const chunks: string[] = []
  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE))
  }
  return chunks
}

export async function getPDFData(content: Buffer): Promise<pdfParse.Result> {
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
