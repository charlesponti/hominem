import { fileStorageService } from '@hominem/utils/storage';
import { logger } from '@hominem/utils/logger';
import { NotFoundError, ValidationError, InternalError } from '../errors';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

type ProcessedFile = {
  id: string;
  originalName: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
  mimetype: string;
  size: number;
  textContent?: string;
  content?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
};

async function indexProcessedFile(_file: ProcessedFile, _userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return {
    success: false,
    message: 'File indexing is not available in the current DB architecture',
  };
}

export const filesRoutes = new Hono<AppContext>()
  // ListOutput user files
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;

      const files = await fileStorageService.listUserFiles(userId);
      return c.json({ files, count: files.length });
    } catch (err) {
      logger.error('[files.list] error', { error: err });
      throw new InternalError('Failed to list files');
    }
  })

  // Get file by ID
  .get('/:fileId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        throw new ValidationError('File ID required');
      }

      const fileData = await fileStorageService.getFile(fileId, userId);

      if (!fileData) {
        throw new NotFoundError('File');
      }

      return c.json({
        data: fileData,
        contentType: 'application/octet-stream',
        message: 'File fetched successfully',
      });
    } catch (err) {
      logger.error('[files.fetch] error', { error: err });
      throw new InternalError('Failed to get file');
    }
  })

  // Get file URL (for direct access)
  .get('/:fileId/url', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        throw new ValidationError('File ID required');
      }

      const url = await fileStorageService.getFileUrl(fileId, userId);

      if (!url) {
        throw new NotFoundError('File');
      }

      return c.json({
        url,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        message: 'URL generated successfully',
      });
    } catch (err) {
      logger.error('[files.getUrl] error', { error: err });
      throw new InternalError('Failed to generate file URL');
    }
  })

  // Delete file
  .delete('/:fileId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        throw new ValidationError('File ID required');
      }

      const deleted = await fileStorageService.deleteFile(fileId, userId);

      if (!deleted) {
        throw new NotFoundError('File not found or could not be deleted');
      }

      return c.json({ success: true, message: 'File deleted successfully' });
    } catch (err) {
      logger.error('[files.remove] error', { error: err });
      throw new InternalError('Failed to delete file');
    }
  })

  // Index file for vector search
  .post('/index', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();

      const parsed = processedFileSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Invalid file data');
      }

      const result = await indexProcessedFile(parsed.data, userId);
      return c.json(result);
    } catch (err) {
      logger.error('[files.index] error', { error: err });
      throw new InternalError('Failed to index file');
    }
  });

const processedFileSchema = z
  .object({
    id: z.string(),
    originalName: z.string(),
    type: z.enum(['image', 'document', 'audio', 'video', 'unknown']),
    mimetype: z.string(),
    size: z.number(),
    textContent: z.string().optional(),
    content: z.string().optional(),
    thumbnail: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .transform((data) => {
    return {
      ...data,
      textContent: data.textContent ?? undefined,
      content: data.content ?? undefined,
      thumbnail: data.thumbnail ?? undefined,
      metadata: data.metadata ?? undefined,
    } as ProcessedFile;
  });
