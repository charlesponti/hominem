import { z } from 'zod';

// Re-export from RPC domain for convenience in this module
export {
  FileAssetSchema,
  FileDeleteOutputSchema,
  FileGetOutputSchema,
  FileListOutputSchema,
  FileRegisterInputSchema,
  FileRegisterOutputSchema,
  FileReprocessOutputSchema,
  FileStatusSchema,
  FileTypeSchema,
  FileUploadUrlInputSchema,
  FileUploadUrlOutputSchema,
  FileUrlOutputSchema,
  type FileAsset,
  type FileDeleteOutput,
  type FileGetOutput,
  type FileListOutput,
  type FileRegisterInput,
  type FileRegisterOutput,
  type FileReprocessOutput,
  type FileStatus,
  type FileType,
  type FileUploadUrlInput,
  type FileUploadUrlOutput,
  type FileUrlOutput,
} from '@hominem/rpc/domains/files';

// =============================================================================
// Local Schemas — not in the RPC domain, used only by this API layer
// =============================================================================

/** Binary download response — returned when fetching the raw file */
export const GetFileResponseSchema = z.object({
  data: z.instanceof(ArrayBuffer),
  contentType: z.string(),
  message: z.string(),
});
export type GetFileResponse = z.infer<typeof GetFileResponseSchema>;
