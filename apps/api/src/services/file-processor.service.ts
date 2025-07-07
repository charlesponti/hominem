import mammoth from 'mammoth'
import { Buffer } from 'node:buffer'
import PDFParser from 'pdf2json'
import sharp from 'sharp'
import OpenAI from 'openai'

export interface ProcessedFile {
  id: string
  originalName: string
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown'
  mimetype: string
  size: number
  textContent?: string
  content?: string
  thumbnail?: string
  metadata?: Record<string, any>
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export class FileProcessorService {
  /**
   * Process a file and extract relevant information
   */
  static async processFile(
    buffer: ArrayBuffer,
    originalName: string,
    mimetype: string,
    fileId: string
  ): Promise<ProcessedFile> {
    const baseFile: ProcessedFile = {
      id: fileId,
      originalName,
      type: this.getFileType(mimetype),
      mimetype,
      size: buffer.byteLength,
    }

    try {
      switch (baseFile.type) {
        case 'image':
          return await this.processImage(buffer, baseFile)
        case 'document':
          return await this.processDocument(buffer, baseFile, mimetype)
        case 'audio':
          return await this.processAudio(buffer, baseFile)
        case 'video':
          return await this.processVideo(buffer, baseFile)
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

  /**
   * Process image files
   */
  private static async processImage(
    buffer: ArrayBuffer,
    file: ProcessedFile
  ): Promise<ProcessedFile> {
    const imageBuffer = Buffer.from(buffer)

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()

    // Create thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer()

    const thumbnail = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`

    // Use GPT-4 Vision to analyze the image if it's not too large
    let textContent = ''
    if (buffer.byteLength < 20 * 1024 * 1024) {
      // 20MB limit for Vision API
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

  /**
   * Process document files
   */
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
            reject(data.parserError)
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

      // Summarize long documents
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
                content: `Please summarize this document:\n\n${textContent.slice(0, 10000)}${textContent.length > 10000 ? '...' : ''}`,
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

  /**
   * TODO: Process audio files
   */
  private static async processAudio(
    buffer: ArrayBuffer,
    file: ProcessedFile
  ): Promise<ProcessedFile> {
    // For audio files, we'll need to transcribe them using Whisper
    // This will be implemented in the transcription action
    return {
      ...file,
      metadata: {
        needsTranscription: true,
      },
    }
  }

  /**
   * TODO: Process video files
   */
  private static async processVideo(
    buffer: ArrayBuffer,
    file: ProcessedFile
  ): Promise<ProcessedFile> {
    // For video files, we could extract audio and transcribe, or extract frames
    // For now, just return basic info
    return {
      ...file,
      metadata: {
        needsProcessing: true,
        type: 'video',
      },
    }
  }

  /**
   * Determine file type from mimetype
   */
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

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Check if a file type is supported for processing
   */
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
