// Re-export MIME utilities from shared module
export {
  CHAT_UPLOAD_ALLOWED_MIME_TYPES,
  CHAT_UPLOAD_MAX_FILE_COUNT,
  CHAT_UPLOAD_MAX_FILE_SIZE_BYTES,
  inferMimeTypeFromFilename,
  isSupportedChatUploadMimeType,
} from '../mime';

export {
  appendChatAttachmentContext,
  appendNoteAttachments,
  formatNoteAttachmentsSection,
  formatUploadedFileContext,
} from './attachments';
export type { UploadAttachmentContextFile } from './attachments';
