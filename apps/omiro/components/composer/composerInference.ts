import type { ComposerEntryKind } from './composer.types';

export type { ComposerEntryKind } from './composer.types';

/**
 * This regex checks a string for:
 * 1. Markdown headings (e.g., "# Heading")
 * 2. Unordered list items (e.g., "- item", "* item", "+ item")
 * 3. Ordered list items (e.g., "1. item", "2) item")
 * 4. Task list items (e.g., "- [ ] task", "* [x] task")
 *
 * If any of these patterns are found, the string is considered structured.
 */
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
