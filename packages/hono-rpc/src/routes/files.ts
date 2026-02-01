import { fileStorageService } from '@hominem/utils/supabase';
import { NotFoundError, ValidationError, InternalError } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const filesRoutes = new Hono<AppContext>()
  // ListOutput user files
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;

      const files = await fileStorageService.listUserFiles(userId);
      return c.json({ files, count: files.length });
    } catch (err) {
      console.error('[files.list] error:', err);
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
      console.error('[files.fetch] error:', err);
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
      console.error('[files.getUrl] error:', err);
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
      console.error('[files.remove] error:', err);
      throw new InternalError('Failed to delete file');
    }
  });
