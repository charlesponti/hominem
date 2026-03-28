import type { Files, Selectable } from '@hominem/db';
import { db } from '@hominem/db';
import { fileProcessingQueue } from '@hominem/queues';
import type {
  FileAsset,
  FileDeleteOutput,
  FileListOutput,
  FileStatus,
  FileType,
  FileRegisterInput,
  FileRegisterOutput,
  FileReprocessOutput,
  FileUploadUrlInput,
  FileUploadUrlOutput,
  FileUrlOutput,
} from '@hominem/rpc/domains/files';
import { FileStatusSchema, FileTypeSchema } from '@hominem/rpc/domains/files';
import { detectFileType } from '@hominem/utils/mime';
import { fileStorageService } from '@hominem/utils/storage';

type FileRow = Selectable<Files>;

function toArrayBuffer(bytes: Buffer): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function toFileType(value: string): FileType {
  const parsed = FileTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : 'unknown';
}

function toFileStatus(value: string): FileStatus {
  const parsed = FileStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : 'pending';
}

function toStringArray(value: FileRow['vector_ids']): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length > 0 ? items : undefined;
}

function toMetadata(value: FileRow['metadata']): Record<string, unknown> | undefined {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

// =============================================================================
// FilesService - Business Logic Layer
//
// Separates concerns:
//   Storage: R2 operations via fileStorageService
//   Registry: user-scoped file metadata in app.files DB table
//   Processing: async pipeline triggered after upload registers
// =============================================================================

export class FilesService {
  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  /**
   * GET /api/files — list all user files (metadata only, no content)
   */
  async listFiles(userId: string): Promise<FileListOutput> {
    const files = await db
      .selectFrom('app.files')
      .where('user_id', '=', userId)
      .orderBy('uploaded_at', 'desc')
      .selectAll()
      .execute();

    return {
      files: files.map((f) => this.#toFileAsset(f)),
      count: files.length,
    };
  }

  /**
   * GET /api/files/:fileId — get file binary data
   */
  async getFile(
    fileId: string,
    userId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    const file = await db
      .selectFrom('app.files')
      .where('id', '=', fileId)
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    if (!file) {
      throw new Error('File not found');
    }

    const fileData = await fileStorageService.getFileByPath(file.key);
    if (!fileData) {
      throw new Error('File data not found in storage');
    }

    return {
      data: toArrayBuffer(fileData),
      contentType: file.mimetype,
    };
  }

  /**
   * GET /api/files/:fileId/url — generate a temporary signed download URL
   */
  async getFileUrl(fileId: string, userId: string): Promise<FileUrlOutput> {
    const file = await db
      .selectFrom('app.files')
      .where('id', '=', fileId)
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

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

    const type = detectFileType(input.mimetype);

    const file = await db
      .insertInto('app.files')
      .values({
        user_id: userId,
        original_name: input.originalName,
        type,
        mimetype: input.mimetype,
        size: input.size,
        status: 'pending',
        key: input.key,
        url: fileStorageService.getPublicUrlForPath(input.key),
        uploaded_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await fileProcessingQueue.add('process', { fileId: file.id, userId });

    return { file: this.#toFileAsset(file), queued: true };
  }

  // ---------------------------------------------------------------------------
  // PROCESSING
  // ---------------------------------------------------------------------------

  /**
   * POST /api/files/:fileId/reprocess — re-run the processing pipeline on an
   * existing file. Useful after AI model updates or if initial processing failed.
   */
  async reprocessFile(fileId: string, userId: string): Promise<FileReprocessOutput> {
    const file = await db
      .selectFrom('app.files')
      .where('id', '=', fileId)
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    if (!file) {
      throw new Error('File not found');
    }

    await db
      .updateTable('app.files')
      .set({ status: 'processing' })
      .where('id', '=', fileId)
      .execute();

    await fileProcessingQueue.add('process', { fileId, userId, reprocess: true });

    return {
      file: this.#toFileAsset({
        ...file,
        status: 'processing',
      }),
      queued: true,
    };
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  /**
   * DELETE /api/files/:fileId — delete file from R2 and remove metadata entry
   */
  async deleteFile(fileId: string, userId: string): Promise<FileDeleteOutput> {
    const file = await db
      .selectFrom('app.files')
      .where('id', '=', fileId)
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    if (!file) {
      throw new Error('File not found');
    }

    await db
      .deleteFrom('app.files')
      .where('id', '=', fileId)
      .where('user_id', '=', userId)
      .execute();

    await fileStorageService.deleteFileByKey(file.key);

    return {
      success: true,
      deletedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /** Map a DB row to the RPC FileAsset shape */
  #toFileAsset(f: FileRow): FileAsset {
    return {
      content: f.content ?? undefined,
      id: f.id,
      error: f.error ?? undefined,
      failedAt: f.failed_at?.toISOString() ?? undefined,
      originalName: f.original_name,
      key: f.key,
      metadata: toMetadata(f.metadata),
      mimetype: f.mimetype,
      processedAt: f.processed_at?.toISOString() ?? undefined,
      size: Number(f.size),
      status: toFileStatus(f.status),
      summary: f.summary ?? undefined,
      textContent: f.text_content ?? undefined,
      thumbnail: f.thumbnail ?? undefined,
      type: toFileType(f.type),
      uploadedAt: f.uploaded_at.toISOString(),
      url: f.url ?? undefined,
      vectorIds: toStringArray(f.vector_ids),
    };
  }
}

export const filesService = new FilesService();
