import type { NoteRecord } from '@hominem/db/notes';

export function toNoteDto(record: NoteRecord) {
  return {
    id: record.id,
    userId: record.userId,
    kind: record.kind,
    title: record.title,
    content: record.content,
    excerpt: record.excerpt,
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
