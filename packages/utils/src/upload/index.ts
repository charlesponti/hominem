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

export const CHAT_UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const CHAT_UPLOAD_MAX_FILE_COUNT = 5;

export {
  appendChatAttachmentContext,
  appendNoteAttachments,
  formatNoteAttachmentsSection,
  formatUploadedFileContext,
} from './attachments';
export type { UploadAttachmentContextFile } from './attachments';

export function isSupportedChatUploadMimeType(mimetype: string): boolean {
  return CHAT_UPLOAD_ALLOWED_MIME_TYPES.includes(
    mimetype as (typeof CHAT_UPLOAD_ALLOWED_MIME_TYPES)[number],
  );
}
