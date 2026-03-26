import type { SessionArtifactMessage } from './session-artifacts';

export interface ConversationMessageLike {
  id: string;
  role: string;
}

export interface NormalizedSendInput {
  fileIds?: string[];
  message: string;
}

const SESSION_ROLES = new Set(['assistant', 'system', 'tool', 'user']);

export function normalizeMessageContent(content: string | null | undefined): string | null {
  const normalized = content?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function normalizeSendInput(input: {
  fileIds?: readonly string[] | null;
  message: string | null | undefined;
}): NormalizedSendInput | null {
  const message = normalizeMessageContent(input.message);
  const fileIds = input.fileIds?.filter((fileId) => fileId.trim().length > 0) ?? [];

  if (!message && fileIds.length === 0) {
    return null;
  }

  return {
    ...(fileIds.length > 0 ? { fileIds: [...fileIds] } : {}),
    message: message ?? '',
  };
}

export function toSessionArtifactMessages<T extends ConversationMessageLike>(
  messages: T[],
  getContent: (message: T) => string | null | undefined,
): SessionArtifactMessage[] {
  return messages.flatMap((message) => {
    if (!SESSION_ROLES.has(message.role)) {
      return [];
    }

    const content = getContent(message) ?? '';

    return [
      {
        role: message.role as SessionArtifactMessage['role'],
        content,
      },
    ];
  });
}

export function findRegenerationSourceMessage<T extends ConversationMessageLike>(
  messages: T[],
  messageId: string,
  getContent: (message: T) => string | null | undefined,
): string | null {
  const messageIndex = messages.findIndex((message) => message.id === messageId);
  if (messageIndex === -1) {
    return null;
  }

  for (let index = messageIndex - 1; index >= 0; index--) {
    const message = messages[index];
    if (!message || message.role !== 'user') {
      continue;
    }

    const content = normalizeMessageContent(getContent(message));
    if (content) {
      return content;
    }
  }

  return null;
}
