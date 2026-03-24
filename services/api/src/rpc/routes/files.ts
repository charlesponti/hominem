import { FileProcessorService } from '@hominem/services/files';
import { logger } from '@hominem/utils/logger';
import { fileStorageService } from '@hominem/utils/storage';
import { Hono } from 'hono';
import * as z from 'zod';

import { NotFoundError, ValidationError, InternalError, isServiceError } from '../errors';
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

async function indexProcessedFile(
  file: ProcessedFile,
  userId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  void file;
  void userId;
  return {
    success: false,
    message: 'File indexing is not available in the current DB architecture',
  };
}

function throwFilesRouteError(err: unknown, logLabel: string, fallbackMessage: string): never {
  logger.error(logLabel, { error: err });

  if (isServiceError(err)) {
    throw err;
  }

  throw new InternalError(fallbackMessage);
}

export const filesRoutes = new Hono<AppContext>()
  // ListOutput user files
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;

      const files = await fileStorageService.listUserFiles(userId);
      return c.json({ files, count: files.length });
    } catch (err) {
      throwFilesRouteError(err, '[files.list] error', 'Failed to list files');
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
      throwFilesRouteError(err, '[files.fetch] error', 'Failed to get file');
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
      throwFilesRouteError(err, '[files.getUrl] error', 'Failed to generate file URL');
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
      throwFilesRouteError(err, '[files.remove] error', 'Failed to delete file');
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
      throwFilesRouteError(err, '[files.index] error', 'Failed to index file');
    }
  })

  .post('/prepare-upload', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = prepareUploadSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Invalid upload request');
      }

      const preparedUpload = await fileStorageService.createPreparedUpload(parsed.data, userId);

      return c.json({
        fileId: preparedUpload.id,
        key: preparedUpload.key,
        originalName: preparedUpload.originalName,
        mimetype: preparedUpload.mimetype,
        size: preparedUpload.size,
        uploadUrl: preparedUpload.uploadUrl,
        headers: preparedUpload.headers,
        url: preparedUpload.url,
        uploadedAt: preparedUpload.uploadedAt.toISOString(),
        expiresAt: preparedUpload.expiresAt.toISOString(),
      });
    } catch (err) {
      throwFilesRouteError(err, '[files.prepareUpload] error', 'Failed to prepare upload');
    }
  })

  .post('/complete-upload', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = completeUploadSchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError(parsed.error?.issues[0]?.message ?? 'Invalid upload completion');
      }

      if (!fileStorageService.isOwnedFilePath(userId, parsed.data.key)) {
        throw new ValidationError('Upload key does not belong to the current user');
      }

      if (!parsed.data.key.includes(parsed.data.fileId)) {
        throw new ValidationError('Upload key does not match the file identifier');
      }

      const exists = await fileStorageService.fileExists(parsed.data.key);
      if (!exists) {
        throw new NotFoundError('Uploaded object');
      }

      const fileBuffer = await fileStorageService.getFileByPath(parsed.data.key);
      if (!fileBuffer) {
        throw new NotFoundError('Uploaded object');
      }

      const processedFile = await FileProcessorService.processFile(
        Uint8Array.from(fileBuffer).buffer,
        parsed.data.originalName,
        parsed.data.mimetype,
        parsed.data.fileId,
      );

      let vectorIds: string[] = [];
      if (processedFile.textContent || processedFile.content) {
        const indexResult = await indexProcessedFile(processedFile, userId);
        if (indexResult.success) {
          vectorIds = [];
        }
      }

      return c.json({
        success: true,
        file: {
          ...processedFile,
          url: fileStorageService.getPublicUrlForPath(parsed.data.key),
          uploadedAt: new Date().toISOString(),
          vectorIds,
        },
        message: 'Upload completed successfully',
      });
    } catch (err) {
      throwFilesRouteError(err, '[files.completeUpload] error', 'Failed to complete upload');
    }
  });

const prepareUploadSchema = z.object({
  originalName: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().positive(),
});

const completeUploadSchema = z.object({
  fileId: z.string().uuid(),
  key: z.string().min(1),
  originalName: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().positive(),
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
