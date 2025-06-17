import sharp from 'sharp'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import { openai } from './openai.server.js'

export interface ProcessedFile {
  id: string
  originalName: string
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown'
  mimetype: string
  size: number
  content?: string
  textContent?: string
  metadata?: Record<string, any>
  thumbnail?: string
  duration?: number
  transcription?: string
}

export async function processFile(
  buffer: ArrayBuffer,
  originalName: string,
  mimetype: string,
  fileId: string
): Promise<ProcessedFile> {
  const baseFile: ProcessedFile = {
    id: fileId,
    originalName,
    type: getFileType(mimetype),
    mimetype,
    size: buffer.byteLength
  }

  try {
    switch (baseFile.type) {
      case 'image':
        return await processImage(buffer, baseFile)
      case 'document':
        return await processDocument(buffer, baseFile, mimetype)
      case 'audio':
        return await processAudio(buffer, baseFile)
      case 'video':
        return await processVideo(buffer, baseFile)
      default:
        return baseFile
    }
  } catch (error) {
    console.error(`Error processing file ${originalName}:`, error)
    return {
      ...baseFile,
      metadata: { error: 'Failed to process file' }
    }
  }
}

async function processImage(buffer: ArrayBuffer, file: ProcessedFile): Promise<ProcessedFile> {
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
  if (buffer.byteLength < 20 * 1024 * 1024) { // 20MB limit for Vision API
    try {
      const base64Image = Buffer.from(buffer).toString('base64')
      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please describe this image in detail. Focus on key elements, text, and context that would be useful for answering questions about it.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.mimetype};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
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
      colorSpace: metadata.space
    }
  }
}

async function processDocument(
  buffer: ArrayBuffer,
  file: ProcessedFile,
  mimetype: string
): Promise<ProcessedFile> {
  let textContent = ''

  try {
    if (mimetype === 'application/pdf') {
      const pdfBuffer = Buffer.from(buffer)
      const data = await pdf(pdfBuffer)
      textContent = data.text
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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that summarizes documents. Provide a concise summary highlighting the key points and main topics.'
            },
            {
              role: 'user',
              content: `Please summarize this document:\n\n${textContent.slice(0, 10000)}${textContent.length > 10000 ? '...' : ''}`
            }
          ],
          max_tokens: 300
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
        summary
      }
    }
  } catch (error) {
    console.error('Error processing document:', error)
    return {
      ...file,
      textContent: '',
      metadata: { error: 'Failed to extract text from document' }
    }
  }
}

async function processAudio(buffer: ArrayBuffer, file: ProcessedFile): Promise<ProcessedFile> {
  // For audio files, we'll need to transcribe them using Whisper
  // This will be implemented in the transcription action
  return {
    ...file,
    metadata: {
      needsTranscription: true
    }
  }
}

async function processVideo(buffer: ArrayBuffer, file: ProcessedFile): Promise<ProcessedFile> {
  // For video files, we could extract audio and transcribe, or extract frames
  // For now, just return basic info
  return {
    ...file,
    metadata: {
      needsProcessing: true
    }
  }
}

function getFileType(mimetype: string): ProcessedFile['type'] {
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('audio/')) return 'audio'
  if (mimetype.startsWith('video/')) return 'video'
  if (
    mimetype === 'application/pdf' ||
    mimetype === 'text/plain' ||
    mimetype.includes('document') ||
    mimetype.includes('word')
  ) {
    return 'document'
  }
  return 'unknown'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}