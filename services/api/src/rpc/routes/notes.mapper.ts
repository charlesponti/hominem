import type { NoteRecord } from '@hominem/db';

export function toNoteDto(record: NoteRecord) {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    content: record.content,
    excerpt: record.excerpt,
    parentNoteId: record.parentNoteId,
    files: record.files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimetype: file.mimetype,
      size: file.size,
      url: file.url,
      uploadedAt: file.uploadedAt,
      ...(file.content ? { content: file.content } : {}),
      ...(file.textContent ? { textContent: file.textContent } : {}),
      ...(file.metadata ? { metadata: file.metadata } : {}),
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toNoteFeedItemDto(record: {
  id: string;
  title: string | null;
  contentPreview: string;
  createdAt: string;
  authorId: string;
  metadata: { hasAttachments: boolean };
}) {
  return {
    id: record.id,
    title: record.title,
    contentPreview: record.contentPreview,
    createdAt: record.createdAt,
    authorId: record.authorId,
    metadata: {
      hasAttachments: record.metadata.hasAttachments,
    },
  };
}
