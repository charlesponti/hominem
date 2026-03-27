// =============================================================================
// MIME Type Utilities - Single source of truth for file type detection
// =============================================================================

// Canonical file type — shared with RPC via zod schema, but defined here so
// utils stays dependency-free. Must match FileTypeSchema in @hominem/rpc/domains/files.
export const FILE_TYPES = ['image', 'document', 'audio', 'video', 'unknown'] as const;
export type FileType = (typeof FILE_TYPES)[number];

// Canonical file type → MIME mapping
export const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  wav: 'audio/wav',
  webm: 'video/webm',
  webp: 'image/webp',
} as const;

// Supported MIME types for chat uploads
export const CHAT_UPLOAD_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'text/csv',
  'application/csv',
] as const;

export const CHAT_UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const CHAT_UPLOAD_MAX_FILE_COUNT = 5;

/** Infer MIME type from a filename extension */
export function inferMimeTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension && extension in MIME_TYPE_BY_EXTENSION) {
    return (
      MIME_TYPE_BY_EXTENSION[extension as keyof typeof MIME_TYPE_BY_EXTENSION] ??
      'application/octet-stream'
    );
  }
  return 'application/octet-stream';
}

/** Get file extension from MIME type */
export function getExtensionFromMimeType(mimetype: string): string {
  const extToMime = Object.entries(MIME_TYPE_BY_EXTENSION).find(([, mime]) => mime === mimetype);
  return extToMime ? `.${extToMime[0]}` : '';
}

/** Check if a MIME type is supported for chat uploads */
export function isSupportedChatUploadMimeType(mimetype: string): boolean {
  return (CHAT_UPLOAD_ALLOWED_MIME_TYPES as readonly string[]).includes(mimetype);
}

/** Validate file size against limit */
export function isFileSizeValid(
  sizeBytes: number,
  maxBytes = CHAT_UPLOAD_MAX_FILE_SIZE_BYTES,
): boolean {
  return sizeBytes > 0 && sizeBytes <= maxBytes;
}

/** Detect file category from MIME type */
export function detectFileType(mimetype: string): FileType {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  if (
    mimetype === 'application/pdf' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword' ||
    mimetype === 'text/plain' ||
    mimetype === 'text/csv' ||
    mimetype === 'application/csv'
  ) {
    return 'document';
  }
  return 'unknown';
}

/**
 * Sanitize filename for storage (remove dangerous characters)
 */
export function sanitizeStorageFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
