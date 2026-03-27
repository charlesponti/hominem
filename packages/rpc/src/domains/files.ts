import { z } from 'zod';

import type { RawHonoClient } from '../core/raw-client';

// =============================================================================
// File Type & File Status (Single Source of Truth)
// =============================================================================

export const FileTypeSchema = z.enum(['image', 'document', 'audio', 'video', 'unknown']);
export type FileType = z.infer<typeof FileTypeSchema>;

export const FileStatusSchema = z.enum(['pending', 'processing', 'ready', 'failed']);
export type FileStatus = z.infer<typeof FileStatusSchema>;

// =============================================================================
// Canonical File Asset
// A FileAsset is a file that has been registered and stored, optionally processed
// =============================================================================

export const FileAssetSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string().min(1),
  type: FileTypeSchema,
  mimetype: z.string().min(1),
  size: z.number().int().nonnegative(),
  status: FileStatusSchema.default('pending'),
  // Content extracted during processing
  content: z.string().optional(),
  textContent: z.string().optional(),
  thumbnail: z.string().optional(),
  // AI-generated summary (documents only)
  summary: z.string().optional(),
  // Vector IDs after embedding
  vectorIds: z.array(z.string()).optional(),
  // Storage location
  key: z.string().min(1),
  url: z.string().url().optional(),
  // Timestamps
  uploadedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
  failedAt: z.string().datetime().optional(),
  // Error info if processing failed
  error: z.string().optional(),
  // Arbitrary metadata
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type FileAsset = z.infer<typeof FileAssetSchema>;

// Backwards compat — ProcessedFile was the old name
export const ProcessedFileSchema = FileAssetSchema;
export type ProcessedFile = FileAsset;

// =============================================================================
// Input Schemas
// =============================================================================

const FileIdParamSchema = z.object({ fileId: z.string().uuid() });

// GET /files → list all user files (summary, no content)
export const FileListOutputSchema = z.object({
  files: z.array(
    FileAssetSchema.pick({
      id: true,
      originalName: true,
      type: true,
      mimetype: true,
      size: true,
      status: true,
      url: true,
      thumbnail: true,
      uploadedAt: true,
    }),
  ),
  count: z.number().int().nonnegative(),
});
export type FileListOutput = z.infer<typeof FileListOutputSchema>;

// GET /files/:fileId → get single file metadata
export const FileGetOutputSchema = z.object({ file: FileAssetSchema });
export type FileGetOutput = z.infer<typeof FileGetOutputSchema>;

// GET /files/:fileId/url → get a temporary signed download URL
export const FileUrlOutputSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type FileUrlOutput = z.infer<typeof FileUrlOutputSchema>;

// POST /files/upload-url → get a presigned upload URL
// Client PUTs directly to R2 — server never sees the bytes
export const FileUploadUrlInputSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimetype: z.string().min(1),
  size: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024),
});
export type FileUploadUrlInput = z.infer<typeof FileUploadUrlInputSchema>;

export const FileUploadUrlOutputSchema = z.object({
  fileId: z.string().uuid(),
  key: z.string().min(1),
  uploadUrl: z.string().url(),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.string().datetime(),
});
export type FileUploadUrlOutput = z.infer<typeof FileUploadUrlOutputSchema>;

// POST /files/register → finalize upload after client PUTs to presigned URL
// Fire-and-forget: registers the file and queues async processing
export const FileRegisterInputSchema = z.object({
  key: z.string().min(1),
  originalName: z.string().min(1),
  mimetype: z.string().min(1),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(100 * 1024 * 1024),
});
export type FileRegisterInput = z.infer<typeof FileRegisterInputSchema>;

export const FileRegisterOutputSchema = z.object({
  file: FileAssetSchema,
  queued: z.boolean(),
});
export type FileRegisterOutput = z.infer<typeof FileRegisterOutputSchema>;

// POST /files/:fileId/reprocess → re-run processing on an existing file
export const FileReprocessOutputSchema = z.object({
  file: FileAssetSchema,
  queued: z.boolean(),
});
export type FileReprocessOutput = z.infer<typeof FileReprocessOutputSchema>;

// DELETE /files/:fileId
export const FileDeleteOutputSchema = z.object({
  success: z.boolean(),
  deletedAt: z.string().datetime(),
});
export type FileDeleteOutput = z.infer<typeof FileDeleteOutputSchema>;

// =============================================================================
// Client Interface
// =============================================================================

export interface FilesClient {
  list(): Promise<FileListOutput>;
  get(input: z.infer<typeof FileIdParamSchema>): Promise<FileGetOutput>;
  getUrl(input: z.infer<typeof FileIdParamSchema>): Promise<FileUrlOutput>;
  getUploadUrl(input: FileUploadUrlInput): Promise<FileUploadUrlOutput>;
  register(input: FileRegisterInput): Promise<FileRegisterOutput>;
  reprocess(input: z.infer<typeof FileIdParamSchema>): Promise<FileReprocessOutput>;
  delete(input: z.infer<typeof FileIdParamSchema>): Promise<FileDeleteOutput>;
}

export function createFilesClient(rawClient: RawHonoClient): FilesClient {
  return {
    async list() {
      const res = await rawClient.api.files.$get();
      return res.json() as Promise<FileListOutput>;
    },
    async get({ fileId }) {
      const res = await rawClient.api.files[':fileId'].$get({ param: { fileId } });
      return res.json() as Promise<FileGetOutput>;
    },
    async getUrl({ fileId }) {
      const res = await rawClient.api.files[':fileId'].url.$get({ param: { fileId } });
      return res.json() as Promise<FileUrlOutput>;
    },
    async getUploadUrl(input) {
      const res = await rawClient.api.files.upload_url.$post({ json: input });
      return res.json() as Promise<FileUploadUrlOutput>;
    },
    async register(input) {
      const res = await rawClient.api.files.register.$post({ json: input });
      return res.json() as Promise<FileRegisterOutput>;
    },
    async reprocess({ fileId }) {
      const res = await rawClient.api.files[':fileId'].reprocess.$post({ param: { fileId } });
      return res.json() as Promise<FileReprocessOutput>;
    },
    async delete({ fileId }) {
      const res = await rawClient.api.files[':fileId'].$delete({ param: { fileId } });
      return res.json() as Promise<FileDeleteOutput>;
    },
  };
}

// =============================================================================
// DEPRECATED — kept for backwards compat until clients are migrated
// =============================================================================

/** @deprecated Use FileAssetSchema / FileUploadUrlInputSchema */
export const FilePrepareUploadInputSchema = FileUploadUrlInputSchema;
/** @deprecated Use FileAssetSchema / FileRegisterInputSchema */
export const FilePrepareUploadOutputSchema = FileUploadUrlOutputSchema;
/** @deprecated Use FileAsset / FileRegisterInput */
export type FilePrepareUploadInput = FileUploadUrlInput;
/** @deprecated Use FileAsset / FileRegisterOutput */
export type FilePrepareUploadOutput = FileUploadUrlOutput;
