import type { FileRecord } from '@hominem/db';
import { FileRepository, db } from '@hominem/db';
import { fileProcessingQueue } from '@hominem/queues';
import { fileStorageService, isStorageServiceError } from '@hominem/storage';
import { logger } from '@hominem/telemetry';
import { Hono } from 'hono';

import { UploadMetadataSchema } from '../../schemas/files.schema';
import { InternalError, NotFoundError, UnavailableError, ValidationError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

function toFilePayload(file: FileRecord) {
  return {
    id: file.id,
    originalName: file.originalName,
    type: file.type,
    mimetype: file.mimetype,
    size: file.size,
    ...(file.content ? { content: file.content } : {}),
    ...(file.textContent ? { textContent: file.textContent } : {}),
    ...(file.metadata ? { metadata: file.metadata } : {}),
    url: file.url,
    uploadedAt: file.uploadedAt,
    vectorIds: [],
  };
}

function toUploadServiceError(error: unknown): Error | null {
  if (isStorageServiceError(error)) {
    switch (error.code) {
      case 'storage.config.missing':
        return new UnavailableError(
          'File uploads are unavailable because storage is not configured.',
        );
      case 'storage.credentials.invalid':
      case 'storage.bucket.access_denied':
        return new UnavailableError(
          'File uploads are unavailable because storage authentication failed.',
        );
      case 'storage.network.unreachable':
        return new UnavailableError(
          'File uploads are temporarily unavailable because storage is unreachable.',
        );
      case 'storage.bucket.missing':
        return new UnavailableError(
          'File uploads are unavailable because the storage bucket is missing.',
        );
      default:
        return new UnavailableError('File uploads are unavailable because storage failed.');
    }
  }

  return null;
}

function logAndThrow(error: unknown, message: string): never {
  logger.error('[files] request failed', { error, message });
  if (error instanceof ValidationError || error instanceof NotFoundError) {
    throw error;
  }
  const uploadServiceError = toUploadServiceError(error);
  if (uploadServiceError) {
    throw uploadServiceError;
  }
  // Anything else with a `code` (e.g. DB errors) gets re-thrown as-is
  if (error instanceof Error && 'code' in error) {
    throw error;
  }
  throw new InternalError(message);
}

export const filesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .delete('/:fileId', async (c) => {
    try {
      const userId = c.get('auth')!.userId;
      const fileId = c.req.param('fileId');

      if (!(await FileRepository.existsForUser(db, fileId, userId))) {
        throw new NotFoundError('File');
      }

      await fileStorageService.deleteFile(fileId, userId);
      await FileRepository.delete(db, { fileId, userId });

      return c.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      logAndThrow(error, 'Failed to delete file');
    }
  })
  .post('/', async (c) => {
    try {
      const userId = c.get('auth')!.userId;
      const body = await c.req.parseBody();
      const file = body.file;

      if (!(file instanceof File)) {
        throw new ValidationError('File is required');
      }

      const parsed = UploadMetadataSchema.safeParse({
        originalName: typeof body.originalName === 'string' ? body.originalName : file.name,
        mimetype: typeof body.mimetype === 'string' ? body.mimetype : file.type,
      });

      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid upload metadata');
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      if (fileBuffer.byteLength === 0) {
        throw new ValidationError('Uploaded file cannot be empty');
      }

      const storedFile = await fileStorageService.storeFile(
        fileBuffer,
        parsed.data.mimetype,
        userId,
        {
          originalName: parsed.data.originalName,
        },
      );

      const stored = await FileRepository.upsert(db, {
        id: storedFile.id,
        userId,
        storageKey: storedFile.filename,
        originalName: parsed.data.originalName,
        mimetype: parsed.data.mimetype,
        size: fileBuffer.byteLength,
        url: storedFile.url,
      });

      await fileProcessingQueue.add(
        'process-file',
        {
          jobId: storedFile.id,
          userId,
          fileId: storedFile.id,
          storageKey: storedFile.filename,
          url: storedFile.url,
          originalName: parsed.data.originalName,
          mimetype: parsed.data.mimetype,
          size: fileBuffer.byteLength,
        },
        {
          jobId: storedFile.id,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return c.json({
        success: true,
        file: toFilePayload(stored),
        message: 'File uploaded successfully',
      });
    } catch (error) {
      logAndThrow(error, 'Failed to upload file');
    }
  });
