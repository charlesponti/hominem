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
    const result = await this.service.listFiles(userId);
    return c.json(result);
  }

  // GET /api/files/:fileId
  async get(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    const result = await this.service.getFile(fileId, userId);
    return c.json(result);
  }

  // GET /api/files/:fileId/url
  async getUrl(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    const result = await this.service.getFileUrl(fileId, userId);
    return c.json(result);
  }

  // DELETE /api/files/:fileId
  async delete(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    const result = await this.service.deleteFile(fileId, userId);
    return c.json(result);
  }

  // POST /api/files/upload-url
  async getUploadUrl(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const body = await c.req.json();
    const parsed = FileUploadUrlInputSchema.safeParse(body);
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? 'Invalid upload request');
    }
    const result = await this.service.getUploadUrl(parsed.data, userId);
    return c.json(result);
  }

  // POST /api/files/register
  async register(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const body = await c.req.json();
    const parsed = FileRegisterInputSchema.safeParse(body);
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? 'Invalid register request');
    }
    const result = await this.service.registerFile(parsed.data, userId);
    return c.json(result);
  }

  // POST /api/files/:fileId/reprocess
  async reprocess(c: Context<AppContext>) {
    const userId = c.get('userId')!;
    const fileId = c.req.param('fileId');
    if (!fileId) throw validation('File ID required');
    const result = await this.service.reprocessFile(fileId, userId);
    return c.json(result);
  }
}

// =============================================================================
// Error Mapping
// =============================================================================

export function handleFilesError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    if (err.message.includes('Authentication required')) {
      throw forbidden('Authentication required', 'other');
    }
    if (err.message.includes('does not belong to the current user')) {
      throw validation(err.message);
    }
    if (err.message.includes('not found') || err.message.includes('missing')) {
      throw notFound('Uploaded object');
    }
  }
  throw internal(fallbackMessage, err);
}
