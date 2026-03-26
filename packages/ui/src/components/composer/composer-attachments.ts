import type { UploadedFile } from '../../types/upload';

export {
  appendChatAttachmentContext,
  appendNoteAttachments,
  formatNoteAttachmentsSection,
  formatUploadedFileContext,
} from '@hominem/utils/upload';

export function getAttachmentType(uploadedFile: UploadedFile): string {
  if (uploadedFile.type !== 'unknown') {
    return uploadedFile.type;
  }

  if (uploadedFile.mimetype.startsWith('image/')) return 'image';
  if (uploadedFile.mimetype.startsWith('audio/')) return 'audio';
  if (uploadedFile.mimetype.startsWith('video/')) return 'video';
  if (
    uploadedFile.mimetype === 'application/pdf' ||
    uploadedFile.mimetype.startsWith('text/') ||
    uploadedFile.mimetype.includes('word') ||
    uploadedFile.mimetype.includes('csv')
  ) {
    return 'document';
  }

  return 'file';
}
