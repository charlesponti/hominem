import { storage } from '~/services/storage/mmkv';
import type { UploadedFile } from '~/types/upload';

import type { ResumeTarget } from './routes';

const INBOX_DRAFT_KEY = 'workspace-feed-draft-v1';
const CHAT_DRAFT_PREFIX = 'workspace-chat-draft-v1:';
const CHAT_COMPOSER_HANDOFF_PREFIX = 'workspace-chat-composer-handoff-v1:';
const RESUME_TARGET_KEY = 'workspace-resume-artifact-v1';

function getChatDraftKey(chatId: string) {
  return `${CHAT_DRAFT_PREFIX}${chatId}`;
}

function getChatComposerHandoffKey(chatId: string) {
  return `${CHAT_COMPOSER_HANDOFF_PREFIX}${chatId}`;
}

interface SerializedUploadedFile extends Omit<UploadedFile, 'uploadedAt'> {
  uploadedAt: string;
}

interface ChatComposerAttachment {
  id: string;
  name: string;
  type: string;
  localUri?: string;
  uploadedFile?: UploadedFile;
}

interface SerializedChatComposerAttachment extends Omit<ChatComposerAttachment, 'uploadedFile'> {
  uploadedFile?: SerializedUploadedFile;
}

export interface ChatComposerHandoff {
  attachments: ChatComposerAttachment[];
  message: string;
}

function readJSONValue<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.remove(key);
    return null;
  }
}

function writeJSONValue<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

function serializeChatComposerAttachment(
  attachment: ChatComposerAttachment,
): SerializedChatComposerAttachment {
  if (!attachment.uploadedFile) {
    return {
      id: attachment.id,
      localUri: attachment.localUri,
      name: attachment.name,
      type: attachment.type,
    };
  }

  return {
    id: attachment.id,
    localUri: attachment.localUri,
    name: attachment.name,
    type: attachment.type,
    uploadedFile: {
      ...attachment.uploadedFile,
      uploadedAt: attachment.uploadedFile.uploadedAt.toISOString(),
    },
  };
}

function deserializeChatComposerAttachment(
  attachment: SerializedChatComposerAttachment,
): ChatComposerAttachment {
  if (!attachment.uploadedFile) {
    return {
      id: attachment.id,
      localUri: attachment.localUri,
      name: attachment.name,
      type: attachment.type,
    };
  }

  return {
    id: attachment.id,
    localUri: attachment.localUri,
    name: attachment.name,
    type: attachment.type,
    uploadedFile: {
      ...attachment.uploadedFile,
      uploadedAt: new Date(attachment.uploadedFile.uploadedAt),
    },
  };
}

export function readInboxDraft(): string {
  return storage.getString(INBOX_DRAFT_KEY) ?? '';
}

export function writeInboxDraft(value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    storage.remove(INBOX_DRAFT_KEY);
    return;
  }

  storage.set(INBOX_DRAFT_KEY, value);
}

export function clearInboxDraft() {
  storage.remove(INBOX_DRAFT_KEY);
}

export function readChatDraft(chatId: string): string {
  return storage.getString(getChatDraftKey(chatId)) ?? '';
}

export function writeChatDraft(chatId: string, value: string) {
  const normalized = value.trim();
  const key = getChatDraftKey(chatId);
  if (normalized.length === 0) {
    storage.remove(key);
    return;
  }

  storage.set(key, value);
}

export function clearChatDraft(chatId: string) {
  storage.remove(getChatDraftKey(chatId));
}

export function writeChatComposerHandoff(chatId: string, handoff: ChatComposerHandoff) {
  writeJSONValue(getChatComposerHandoffKey(chatId), {
    ...handoff,
    attachments: handoff.attachments.map(serializeChatComposerAttachment),
  });
}

export function readChatComposerHandoff(chatId: string): ChatComposerHandoff | null {
  const handoff = readJSONValue<{
    attachments: SerializedChatComposerAttachment[];
    message: string;
  }>(getChatComposerHandoffKey(chatId));

  if (!handoff) {
    return null;
  }

  return {
    ...handoff,
    attachments: handoff.attachments.map(deserializeChatComposerAttachment),
  };
}

export function consumeChatComposerHandoff(chatId: string): ChatComposerHandoff | null {
  const handoff = readChatComposerHandoff(chatId);
  if (!handoff) {
    return null;
  }

  storage.remove(getChatComposerHandoffKey(chatId));
  return handoff;
}

export function writeResumeTarget(target: ResumeTarget) {
  writeJSONValue(RESUME_TARGET_KEY, target);
}

export function readResumeTarget(): ResumeTarget | null {
  return readJSONValue<ResumeTarget>(RESUME_TARGET_KEY);
}

export function clearResumeTarget() {
  storage.remove(RESUME_TARGET_KEY);
}

export function consumeResumeTarget(): ResumeTarget | null {
  const target = readResumeTarget();
  if (!target) {
    return null;
  }

  clearResumeTarget();
  return target;
}

let hasAttemptedRestore = false;
export function consumeRestoreAttempt(): boolean {
  if (hasAttemptedRestore) {
    return false;
  }

  hasAttemptedRestore = true;
  return true;
}
