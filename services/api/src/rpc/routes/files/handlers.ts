import { FileRegisterInputSchema, FileUploadUrlInputSchema } from '@hominem/rpc/domains/files';
import { forbidden, internal, notFound, validation } from '@hominem/services/errors';
import type { Context } from 'hono';

import type { AppContext } from '../../middleware/auth';
import type { FilesService } from './service';

// =============================================================================
// Thin Handlers — validate → service → respond
// =============================================================================

export class FilesHandlers {
  constructor(private service: FilesService) {}

  // GET /api/files
  async list(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    try {
      const result = await this.service.listFiles(userId);
      return c.json(result);
    } catch (err) {
      handleFilesError(err, 'Failed to list files');
    }
  }

  // GET /api/files/:fileId
  async get(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    try {
      const { data, contentType } = await this.service.getFile(fileId, userId);
      return new Response(new Blob([data]), {
        headers: {
          'Content-Type': contentType,
        },
        status: 200,
      });
    } catch (err) {
      handleFilesError(err, 'Failed to get file');
    }
  }

  // GET /api/files/:fileId/url
  async getUrl(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    try {
      const result = await this.service.getFileUrl(fileId, userId);
      return c.json(result);
    } catch (err) {
      handleFilesError(err, 'Failed to get file URL');
    }
  }

  // DELETE /api/files/:fileId
  async delete(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    try {
      const result = await this.service.deleteFile(fileId, userId);
      return c.json(result);
    } catch (err) {
      handleFilesError(err, 'Failed to delete file');
    }
  }

  // POST /api/files/upload-url
  async getUploadUrl(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    try {
      const body = await c.req.json();
      const parsed = FileUploadUrlInputSchema.safeParse(body);
      if (!parsed.success) {
        throw validation(parsed.error.issues[0]?.message ?? 'Invalid upload request');
      }
      const result = await this.service.getUploadUrl(parsed.data, userId);
      return c.json(result);
    } catch (err) {
      handleFilesError(err, 'Failed to prepare upload');
    }
  }

  // POST /api/files/register
  async register(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    try {
      const body = await c.req.json();
      const parsed = FileRegisterInputSchema.safeParse(body);
      if (!parsed.success) {
        throw validation(parsed.error.issues[0]?.message ?? 'Invalid register request');
      }
      const result = await this.service.registerFile(parsed.data, userId);
      return c.json(result);
    } catch (err) {
      handleFilesError(err, 'Failed to register file');
    }
  }

  // POST /api/files/:fileId/reprocess
  async reprocess(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    try {
      const result = await this.service.reprocessFile(fileId, userId);
      return c.json(result);
    } catch (err) {
      handleFilesError(err, 'Failed to reprocess file');
    }
  }
}

// =============================================================================
// Error Mapping
// =============================================================================

export function handleFilesError(err: unknown, fallbackMessage: string): never {
  if (err instanceof Error) {
    if (err.message.includes('Authentication required')) {
      throw forbidden('Authentication required', 'other');
    }
    if (err.message.includes('does not belong to the current user')) {
      throw validation(err.message);
    }
    if (err.message.includes('Uploaded object not found')) {
      throw notFound('Uploaded object');
    }
    if (err.message.includes('File data not found')) {
      throw notFound('File');
    }
    if (err.message.includes('File not found')) {
      throw notFound('File');
    }
    if (err.message.includes('not found') || err.message.includes('missing')) {
      throw notFound('Uploaded object');
    }
  }
  throw internal(fallbackMessage, err);
}
