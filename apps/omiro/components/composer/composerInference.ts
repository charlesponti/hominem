import type { ComposerEntryKind } from './composer.types';

export type { ComposerEntryKind } from './composer.types';

const STRUCTURED_LINE = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|[-*+]\s*\[[ xX]\]\s)/;

export function inferComposerEntryKind(message: string): ComposerEntryKind {
  const normalized = message.trim();
  if (!normalized) return 'note';
  if (
    normalized.includes('\n') ||
    normalized.split(/\r?\n/).some((line) => STRUCTURED_LINE.test(line))
  ) {
    return 'note';
  }
  return 'chat';
}
