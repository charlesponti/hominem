import type { ChatMessageSnapshot, ChatSnapshot } from '@hominem/chat';
import type { ChatSourceRecord } from '@hominem/db/chats';

export function toChatDto(record: ChatSnapshot) {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toChatMessageDto(record: ChatMessageSnapshot) {
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
