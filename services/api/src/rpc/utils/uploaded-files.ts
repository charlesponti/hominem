import { FileProcessorService } from '@hominem/services/files';
import { fileStorageService } from '@hominem/utils/storage';

import { ValidationError } from '../errors';

export interface ResolvedUploadedFile {
  id: string;
  originalName: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
  mimetype: string;
  size: number;
  url: string;
  content?: string;
  textContent?: string;
}

function inferMimeTypeFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'csv':
      return 'text/csv';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'gif':
      return 'image/gif';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'mp3':
      return 'audio/mpeg';
    case 'mp4':
      return 'video/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'txt':
      return 'text/plain';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'video/webm';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function getOriginalFilename(storedName: string, fileId: string): string {
  const prefix = `${fileId}-`;

  if (storedName.startsWith(prefix)) {
    return storedName.slice(prefix.length);
  }

  return storedName;
}

export async function resolveUploadedFiles(
  userId: string,
  fileIds: string[],
): Promise<ResolvedUploadedFile[]> {
  if (fileIds.length === 0) {
    return [];
  }

  const userFiles = await fileStorageService.listUserFiles(userId);

  return await Promise.all(
    [...new Set(fileIds)].map(async (fileId) => {
      const storedFile = userFiles.find((file) => file.name.startsWith(fileId));
      const url = await fileStorageService.getFileUrl(fileId, userId);
      const fileData = await fileStorageService.getFile(fileId, userId);

      if (!storedFile || !url || !fileData) {
        throw new ValidationError(`Uploaded file ${fileId} is not available`);
      }

      const originalName = getOriginalFilename(storedFile.name, fileId);
      const mimetype = inferMimeTypeFromFilename(originalName);
      const processedFile = await FileProcessorService.processFile(
        fileData,
        originalName,
        mimetype,
        fileId,
      );

      return {
        id: fileId,
        originalName,
        type: processedFile.type,
        mimetype,
        size: storedFile.size,
        url,
        ...(processedFile.content ? { content: processedFile.content } : {}),
        ...(processedFile.textContent ? { textContent: processedFile.textContent } : {}),
      };
    }),
  );
}
