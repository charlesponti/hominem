import { Buffer } from 'node:buffer'
import mammoth from 'mammoth'
import OpenAI from 'openai'
import PDFParser from 'pdf2json'
import sharp from 'sharp'

export interface ProcessedFile {
  id: string
  originalName: string
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown'
  mimetype: string
  size: number
  textContent?: string
  content?: string
  thumbnail?: string
  metadata?: Record<string, unknown>
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export class FileProcessorService {
  static async processFile(
    buffer: ArrayBuffer,
    originalName: string,
    mimetype: string,
    fileId: string
  ): Promise<ProcessedFile> {
    const baseFile: ProcessedFile = {
      id: fileId,
      originalName,
      type: FileProcessorService.getFileType(mimetype),
      mimetype,
      size: buffer.byteLength,
    }

    try {
      switch (baseFile.type) {
        case 'image':
          return await FileProcessorService.processImage(buffer, baseFile)
        case 'document':
          return await FileProcessorService.processDocument(buffer, baseFile, mimetype)
        case 'audio':
          return await FileProcessorService.processAudio(buffer, baseFile)
        case 'video':
          return await FileProcessorService.processVideo(buffer, baseFile)
        default:
          return baseFile
      }
    } catch (error) {
      console.error(`Error processing file ${originalName}:`, error)
      return {
        ...baseFile,
        metadata: { error: 'Failed to process file' },
      }
    }
  }

  private static async processImage(
    buffer: ArrayBuffer,
    file: ProcessedFile
  ): Promise<ProcessedFile> {
    const imageBuffer = Buffer.from(buffer)

    const metadata = await sharp(imageBuffer).metadata()

    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer()

    const thumbnail = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`

    let textContent = ''
    if (buffer.byteLength < 20 * 1024 * 1024) {
      try {
        const base64Image = Buffer.from(buffer).toString('base64')
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please describe this image in detail. Focus on key elements, text, and context that would be useful for answering questions about it.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.mimetype};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        })

        textContent = response.choices[0]?.message?.content || ''
      } catch (error) {
        console.warn('Failed to analyze image with GPT-4 Vision:', error)
      }
    }

    return {
      ...file,
      textContent,
      thumbnail,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
        colorSpace: metadata.space,
      },
    }
  }

  private static async processDocument(
    buffer: ArrayBuffer,
    file: ProcessedFile,
    mimetype: string
  ): Promise<ProcessedFile> {
    let textContent = ''

    try {
      if (mimetype === 'application/pdf') {
        const pdfBuffer = Buffer.from(buffer)
        textContent = await new Promise<string>((resolve, reject) => {
          const parser = new PDFParser(undefined, true)
          parser.on('pdfParser_dataError', (data) => {
            reject((data as { parserError: Error }).parserError)
          })
          parser.on('pdfParser_dataReady', () => {
            try {
              resolve(parser.getRawTextContent())
            } catch (e) {
              reject(e)
            }
          })
          parser.parseBuffer(pdfBuffer)
        })
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword'
      ) {
        const docBuffer = Buffer.from(buffer)
        const result = await mammoth.extractRawText({ buffer: docBuffer })
        textContent = result.value
      } else if (mimetype === 'text/plain') {
        textContent = new TextDecoder().decode(buffer)
      }

      let summary = ''
      if (textContent.length > 1000) {
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant that summarizes documents. Provide a concise summary highlighting the key points and main topics.',
              },
              {
                role: 'user',
                content: `Please summarize this document:\n\n${textContent.slice(0, 10000)}${
                  textContent.length > 10000 ? '...' : ''
                }`,
              },
            ],
            max_tokens: 300,
          })

          summary = response.choices[0]?.message?.content || ''
        } catch (error) {
          console.warn('Failed to summarize document:', error)
        }
      }

      return {
        ...file,
        textContent,
        content: summary || textContent.slice(0, 500),
        metadata: {
          characterCount: textContent.length,
          wordCount: textContent.split(/\s+/).length,
          summary,
        },
      }
    } catch (error) {
      console.error('Error processing document:', error)
      return {
        ...file,
        textContent: '',
        metadata: { error: 'Failed to extract text from document' },
      }
    }
  }

  private static async processAudio(
    _buffer: ArrayBuffer,
    file: ProcessedFile
  ): Promise<ProcessedFile> {
    return {
      ...file,
      metadata: {
        needsTranscription: true,
      },
    }
  }

  private static async processVideo(
    _buffer: ArrayBuffer,
    file: ProcessedFile
  ): Promise<ProcessedFile> {
    return {
      ...file,
      metadata: {
        needsProcessing: true,
        type: 'video',
      },
    }
  }

  private static getFileType(mimetype: string): ProcessedFile['type'] {
    if (mimetype.startsWith('image/')) {
      return 'image'
    }
    if (mimetype.startsWith('audio/')) {
      return 'audio'
    }
    if (mimetype.startsWith('video/')) {
      return 'video'
    }
    if (
      mimetype === 'application/pdf' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword' ||
      mimetype === 'text/plain'
    ) {
      return 'document'
    }
    return 'unknown'
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = Math.round((bytes / 1024 ** i) * 100) / 100
    return `${size} ${sizes[i]}`
  }

  static isSupportedFileType(mimetype: string): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'video/mp4',
      'video/webm',
    ]

    return supportedTypes.includes(mimetype)
  }
}
