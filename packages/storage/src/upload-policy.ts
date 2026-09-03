export const UPLOAD_ALLOWED_MIME_TYPES = [
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

export const UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_MAX_FILE_COUNT = 5;
const UPLOAD_ALLOWED_MIME_TYPE_SET = new Set<string>(UPLOAD_ALLOWED_MIME_TYPES);

export type UploadPolicyFile = {
  name: string;
  size: number;
  type?: string;
};

export type FileValidationOptions = {
  maxSizeBytes: number;
  allowedTypes: readonly string[];
};

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

export function isSupportedUploadMimeType(mimetype: string): boolean {
  return UPLOAD_ALLOWED_MIME_TYPE_SET.has(mimetype);
}

export function normalizeMissingUploadMimeType(
  mimetype: string | undefined,
  fileName: string,
  fallbackMimeType = 'application/pdf',
): string {
  const type = mimetype === 'application/octet-stream' ? '' : (mimetype ?? '');
  return type || (fileName.toLowerCase().endsWith('.pdf') ? fallbackMimeType : '');
}

export function resolveUploadMimeType(
  file: UploadPolicyFile,
  fallbackMimeType = 'application/pdf',
): string {
  return normalizeMissingUploadMimeType(file.type, file.name, fallbackMimeType);
}

export function isAllowedFileType(
  file: UploadPolicyFile,
  allowedTypes: readonly string[],
): boolean {
  if (file.type && allowedTypes.includes(file.type)) return true;

  const normalizedType = resolveUploadMimeType(file);
  return Boolean(normalizedType && allowedTypes.includes(normalizedType));
}

export function validateFile(
  file: UploadPolicyFile,
  options: FileValidationOptions,
): FileValidationResult {
  if (file.size > options.maxSizeBytes) {
    const maxSizeMB = options.maxSizeBytes / (1024 * 1024);
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  if (!isAllowedFileType(file, options.allowedTypes)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
    };
  }
  return { valid: true };
}
