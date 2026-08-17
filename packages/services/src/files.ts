import { Buffer } from 'node:buffer';

import { LOG_MESSAGES, logger } from '@hominem/telemetry';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

export interface ProcessedFile {
  id: string;
  originalName: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
  mimetype: string;
  size: number;
  textContent?: string;
  content?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generic, non-AI file access and extraction: type detection, raw text
 * extraction from documents, and size/support helpers. Domain-specific
 * analysis of that content (e.g. generating an image description or a
 * document summary via an LLM) belongs to whichever feature consumes it,
 * not here.
 */
export class FileProcessorService {
  static async processFile(
    buffer: ArrayBuffer,
    originalName: string,
    mimetype: string,
    fileId: string,
  ): Promise<ProcessedFile> {
    const baseFile: ProcessedFile = {
      id: fileId,
      originalName,
      type: FileProcessorService.getFileType(mimetype),
      mimetype,
      size: buffer.byteLength,
    };

    try {
      switch (baseFile.type) {
        case 'document':
          return await FileProcessorService.processDocument(buffer, baseFile, mimetype);
        case 'audio':
          return await FileProcessorService.processAudio(buffer, baseFile);
        case 'video':
          return await FileProcessorService.processVideo(buffer, baseFile);
        default:
          return baseFile;
      }
    } catch (error) {
      logger.error(LOG_MESSAGES.FILE_PROCESS_ERROR, { originalName, error });
      return {
        ...baseFile,
        metadata: { error: 'Failed to process file' },
      };
    }
  }

  private static async processDocument(
    buffer: ArrayBuffer,
    file: ProcessedFile,
    mimetype: string,
  ): Promise<ProcessedFile> {
    let textContent = '';

    try {
      if (mimetype === 'application/pdf') {
        const pdfBuffer = Buffer.from(buffer);
        textContent = await new Promise<string>((resolve, reject) => {
          const parser = new PDFParser(undefined, true);
          parser.on('pdfParser_dataError', (data) => {
            reject((data as { parserError: Error }).parserError);
          });
          parser.on('pdfParser_dataReady', () => {
            try {
              resolve(parser.getRawTextContent());
            } catch (e) {
              reject(e);
            }
          });
          parser.parseBuffer(pdfBuffer);
        });
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword'
      ) {
        const docBuffer = Buffer.from(buffer);
        const result = await mammoth.extractRawText({ buffer: docBuffer });
        textContent = result.value;
      } else if (mimetype === 'text/plain') {
        textContent = new TextDecoder().decode(buffer);
      }

      return {
        ...file,
        textContent,
        content: textContent.slice(0, 500),
        metadata: {
          characterCount: textContent.length,
          wordCount: textContent.split(/\s+/).length,
        },
      };
    } catch (error) {
      logger.error(LOG_MESSAGES.DOCUMENT_PROCESS_ERROR, { error });
      return {
        ...file,
        textContent: '',
        metadata: { error: 'Failed to extract text from document' },
      };
    }
  }

  private static async processAudio(
    _buffer: ArrayBuffer,
    file: ProcessedFile,
  ): Promise<ProcessedFile> {
    return {
      ...file,
      metadata: {
        needsTranscription: true,
      },
    };
  }

  private static async processVideo(
    _buffer: ArrayBuffer,
    file: ProcessedFile,
  ): Promise<ProcessedFile> {
    return {
      ...file,
      metadata: {
        needsProcessing: true,
        type: 'video',
      },
    };
  }

  private static getFileType(mimetype: string): ProcessedFile['type'] {
    if (mimetype.startsWith('image/')) {
      return 'image';
    }
    if (mimetype.startsWith('audio/')) {
      return 'audio';
    }
    if (mimetype.startsWith('video/')) {
      return 'video';
    }
    if (
      mimetype === 'application/pdf' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword' ||
      mimetype === 'text/plain'
    ) {
      return 'document';
    }
    return 'unknown';
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
      return '0 Bytes';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round((bytes / 1024 ** i) * 100) / 100;
    return `${size} ${sizes[i]}`;
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
    ];

    return supportedTypes.includes(mimetype);
  }
}
