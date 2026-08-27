import { storage } from '~/services/storage/mmkv';

import type { ResumeTarget } from './routes';

const ALL_DRAFT_KEY = 'workspace-feed-draft-v1';
const NEW_CHAT_DRAFT_KEY = 'workspace-new-chat-draft-v1';
const CHAT_DRAFT_PREFIX = 'workspace-chat-draft-v1:';
const RESUME_TARGET_KEY = 'workspace-resume-artifact-v1';
const PENDING_CHAT_START_PREFIX = 'workspace-pending-chat-start-v1:';

export type PendingChatStart = {
  message: string;
  fileIds?: string[];
  responseModality?: 'text' | 'audio';
};

function getChatDraftKey(chatId: string) {
  return `${CHAT_DRAFT_PREFIX}${chatId}`;
}

function getPendingChatStartKey(chatId: string) {
  return `${PENDING_CHAT_START_PREFIX}${chatId}`;
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

export function readAllDraft(): string {
  return storage.getString(ALL_DRAFT_KEY) ?? '';
}

export function writeAllDraft(value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    storage.remove(ALL_DRAFT_KEY);
    return;
  }

  storage.set(ALL_DRAFT_KEY, value);
}

export function clearAllDraft() {
  storage.remove(ALL_DRAFT_KEY);
}

export function readNewChatDraft(): string {
  return storage.getString(NEW_CHAT_DRAFT_KEY) ?? '';
}

export function writeNewChatDraft(value: string) {
  if (!value.trim()) {
    storage.remove(NEW_CHAT_DRAFT_KEY);
    return;
  }

  storage.set(NEW_CHAT_DRAFT_KEY, value);
}

export function clearNewChatDraft() {
  storage.remove(NEW_CHAT_DRAFT_KEY);
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

export function writePendingChatStart(chatId: string, value: PendingChatStart) {
  writeJSONValue(getPendingChatStartKey(chatId), value);
}

export function consumePendingChatStart(chatId: string): PendingChatStart | null {
  const key = getPendingChatStartKey(chatId);
  const value = readJSONValue<PendingChatStart>(key);
  storage.remove(key);
  return value;
}
