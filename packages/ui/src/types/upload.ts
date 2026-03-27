// ============================================================================
// File Processing Types — shared across client and UI
// ============================================================================

/** File processing status */
export type FileStatus = 'pending' | 'processing' | 'ready' | 'failed';

/**
 * Successfully uploaded file (API response)
 * Matches FileAsset from @hominem/rpc/domains/files
 */
export interface UploadedFile {
  id: string;
  originalName: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
  mimetype: string;
  size: number;
  status: FileStatus;
  content?: string;
  textContent?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
  url: string;
  uploadedAt: Date;
  vectorIds?: string[];
}

export interface FailedUpload {
  name: string;
  error: string;
}

export interface UploadResponse {
  success: boolean;
  files: UploadedFile[];
  failed: FailedUpload[];
  message: string;
  error?: string;
}
