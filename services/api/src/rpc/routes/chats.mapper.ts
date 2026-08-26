import type {
  ChatMessageFileRecord,
  ChatMessageRecord,
  ChatRecord,
  ChatSourceRecord,
} from '@hominem/db';

export function toChatDto(record: ChatRecord) {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toChatMessageDto(record: ChatMessageRecord) {
  return {
    id: record.id,
    chatId: record.chatId,
    userId: record.userId,
    role: record.role,
    content: record.content,
    files: record.files,
    toolCalls: record.toolCalls,
    reasoning: record.reasoning,
    parentMessageId: record.parentMessageId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toChatSourceDto(record: ChatSourceRecord) {
  return {
    id: record.id,
    chatId: record.chatId,
    noteId: record.noteId,
    title: record.title,
    addedByUserId: record.addedByUserId,
    createdAt: record.createdAt,
  };
}

export function toStoredUserMessageContent(
  message: string,
  files: ChatMessageFileRecord[],
): string {
  const trimmed = message.trim();
  if (trimmed.length > 0) return trimmed;
  if (files.length > 0) return files.map((file) => file.filename ?? 'Attachment').join(', ');
  return '';
}
