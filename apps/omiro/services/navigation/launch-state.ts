import { storage } from '~/services/storage/mmkv';

import type { ResumeTarget } from './routes';

const INBOX_DRAFT_KEY = 'workspace-feed-draft-v1';
const NEW_CHAT_DRAFT_KEY = 'workspace-new-chat-draft-v1';
const CHAT_DRAFT_PREFIX = 'workspace-chat-draft-v1:';
const RESUME_TARGET_KEY = 'workspace-resume-artifact-v1';

function getChatDraftKey(chatId: string) {
  return `${CHAT_DRAFT_PREFIX}${chatId}`;
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
