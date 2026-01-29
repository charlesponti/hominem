import { fileStorageService } from '@hominem/utils/supabase';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const filesRoutes = new Hono<AppContext>()
  // ListOutput user files
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;

      const files = await fileStorageService.listUserFiles(userId);
      return c.json(success({ files, count: files.length }));
    } catch (err) {
      console.error('[files.list] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to list files'), 500);
    }
  })

  // Get file by ID
  .get('/:fileId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        return c.json(error('VALIDATION_ERROR', 'File ID required'), 400);
      }

      const fileData = await fileStorageService.getFile(fileId, userId);

      if (!fileData) {
        return c.json(error('NOT_FOUND', 'File not found'), 404);
      }

      return c.json(
        success({
          data: fileData,
          contentType: 'application/octet-stream',
          message: 'File fetched successfully',
        }),
      );
    } catch (err) {
      console.error('[files.fetch] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to get file'), 500);
    }
  })

  // Get file URL (for direct access)
  .get('/:fileId/url', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        return c.json(error('VALIDATION_ERROR', 'File ID required'), 400);
      }

      const url = await fileStorageService.getFileUrl(fileId, userId);

      if (!url) {
        return c.json(error('NOT_FOUND', 'File not found'), 404);
      }

      return c.json(
        success({
          url,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          message: 'URL generated successfully',
        }),
      );
    } catch (err) {
      console.error('[files.getUrl] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to generate file URL'), 500);
    }
  })

  // Delete file
  .delete('/:fileId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const fileId = c.req.param('fileId');

      if (!fileId) {
        return c.json(error('VALIDATION_ERROR', 'File ID required'), 400);
      }

      const deleted = await fileStorageService.deleteFile(fileId, userId);

      if (!deleted) {
        return c.json(error('NOT_FOUND', 'File not found or could not be deleted'), 404);
      }

      return c.json(success({ success: true, message: 'File deleted successfully' }));
    } catch (err) {
      console.error('[files.remove] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete file'), 500);
    }
  });
