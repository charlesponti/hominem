import type {
  FileAsset,
  FileDeleteOutput,
  FileListOutput,
  FileRegisterInput,
  FileRegisterOutput,
  FileReprocessOutput,
  FileUploadUrlInput,
  FileUploadUrlOutput,
  FileUrlOutput,
} from '@hominem/rpc/domains/files';
import { detectFileType } from '@hominem/utils/mime';
import { fileStorageService } from '@hominem/utils/storage';

import type { GetFileResponse } from './schema';

// =============================================================================
// FilesService - Business Logic Layer
//
// Separates concerns:
//   Storage: R2 operations via fileStorageService
//   Registry: user-scoped file metadata (in-memory for now; DB later)
//   Processing: async pipeline triggered after upload registers (TODO)
// =============================================================================

// In-memory registry: userId → fileId → FileAsset
// TODO: replace with DB-backed registry when schema is ready
const fileRegistry = new Map<string, Map<string, FileAsset>>();

function getUserRegistry(userId: string): Map<string, FileAsset> {
  if (!fileRegistry.has(userId)) {
    fileRegistry.set(userId, new Map());
  }
  return fileRegistry.get(userId)!;
}

export class FilesService {
  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  /**
   * GET /api/files — list all user files (metadata only, no content)
   */
  async listFiles(userId: string): Promise<FileListOutput> {
    const userFiles = getUserRegistry(userId);
    const files = Array.from(userFiles.values()).map((f) => ({
      id: f.id,
      originalName: f.originalName,
      type: f.type,
      mimetype: f.mimetype,
      size: f.size,
      status: f.status,
      url: f.url,
      thumbnail: f.thumbnail,
      uploadedAt: f.uploadedAt,
    }));
    return { files, count: files.length };
  }

  /**
   * GET /api/files/:fileId — get file binary data
   */
  async getFile(fileId: string, userId: string): Promise<GetFileResponse> {
    const userFiles = getUserRegistry(userId);
    const file = userFiles.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const fileData = await fileStorageService.getFileByPath(file.key);
    if (!fileData) {
      throw new Error('File data not found in storage');
    }

    return {
      data: fileData.buffer as ArrayBuffer,
      contentType: file.mimetype,
      message: 'File fetched successfully',
    };
  }

  /**
   * GET /api/files/:fileId/url — generate a temporary signed download URL
   */
  async getFileUrl(fileId: string, userId: string): Promise<FileUrlOutput> {
    const userFiles = getUserRegistry(userId);
    const file = userFiles.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const url = await fileStorageService.getSignedUrl(file.key);
    return {
      url,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // UPLOAD
  // ---------------------------------------------------------------------------

  /**
   * POST /api/files/upload-url — get a presigned URL for direct client → R2 upload.
   * Server never proxies the file bytes. Client PUTs directly to R2.
   */
  async getUploadUrl(input: FileUploadUrlInput, userId: string): Promise<FileUploadUrlOutput> {
    const prepared = await fileStorageService.createPreparedUpload(input, userId);
    return {
      fileId: prepared.id,
      key: prepared.key,
      uploadUrl: prepared.uploadUrl,
      headers: prepared.headers,
      expiresAt: prepared.expiresAt.toISOString(),
    };
  }

  /**
   * POST /api/files/register — finalize upload after client PUTs to the presigned URL.
   *
   * Fire-and-forget: registers the file with status=pending, then queues async
   * processing. The client gets an immediate response and can poll for status.
   *
   * Key insight: we intentionally do NOT process the file here. That happens
   * in a background worker to keep the upload response fast and reliable.
   */
  async registerFile(input: FileRegisterInput, userId: string): Promise<FileRegisterOutput> {
    if (!fileStorageService.isOwnedFilePath(userId, input.key)) {
      throw new Error('Upload key does not belong to the current user');
    }

    const exists = await fileStorageService.fileExists(input.key);
    if (!exists) {
      throw new Error('Uploaded object not found in storage');
    }

    const now = new Date().toISOString();
    const type = detectFileType(input.mimetype);

    const file: FileAsset = {
      id: crypto.randomUUID(),
      originalName: input.originalName,
      type,
      mimetype: input.mimetype,
      size: input.size,
      status: 'pending',
      key: input.key,
      url: fileStorageService.getPublicUrlForPath(input.key),
      uploadedAt: now,
    };

    getUserRegistry(userId).set(file.id, file);

    // TODO: enqueue 'file.received' event to async worker
    // const queued = await enqueueFileProcessing({ fileId: file.id, userId })
    const queued = true;

    return { file, queued };
  }

  // ---------------------------------------------------------------------------
  // PROCESSING
  // ---------------------------------------------------------------------------

  /**
   * POST /api/files/:fileId/reprocess — re-run the processing pipeline on an
   * existing file. Useful after AI model updates or if initial processing failed.
   */
  async reprocessFile(fileId: string, userId: string): Promise<FileReprocessOutput> {
    const userFiles = getUserRegistry(userId);
    const file = userFiles.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    const updated: FileAsset = { ...file, status: 'processing' };
    userFiles.set(fileId, updated);

    // TODO: enqueue reprocessing job
    // const queued = await enqueueFileProcessing({ fileId, userId, reprocess: true })
    const queued = true;

    return { file: updated, queued };
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  /**
   * DELETE /api/files/:fileId — delete file from R2 and remove metadata entry
   */
  async deleteFile(fileId: string, userId: string): Promise<FileDeleteOutput> {
    const userFiles = getUserRegistry(userId);
    const file = userFiles.get(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    await fileStorageService.deleteFile(fileId, userId);
    userFiles.delete(fileId);

    return {
      success: true,
      deletedAt: new Date().toISOString(),
    };
  }
}

export const filesService = new FilesService();
