/**
 * useComposerMode
 *
 * Derives the Composer's operating mode directly from the current URL,
 * eliminating the need for each route to imperatively push context.
 *
 * Mode table (aligned with layout plan Phase 1):
 *
 *   Route          Mode                noteId   chatId
 *   /home          generic             –        –
 *   /chat/:id      chat-continuation   –        ✓ from URL
 *   /notes/:id     note-aware          ✓ from URL  –
 *   /notes/:id.*   note-aware          ✓ from URL  –
 *   everything else generic            –        –
 *
 * noteTitle is NOT derived here — it comes from the loaded Note object and
 * is pushed via setNoteTitle in the note route once data arrives.
 */

import type { ComposerMode } from '@hominem/ui/composer';
import { useMatch } from 'react-router';

export interface ComposerModeResult {
  mode: ComposerMode;
  noteId: string | null;
  chatId: string | null;
}

export function useComposerMode(): ComposerModeResult {
  const chatMatch = useMatch('/chat/:chatId');
  const noteMatch = useMatch('/notes/:noteId');
  const noteSubMatch = useMatch('/notes/:noteId/*');

  if (chatMatch?.params.chatId) {
    return { mode: 'chat-continuation', chatId: chatMatch.params.chatId, noteId: null };
  }

  const resolvedNoteId = noteMatch?.params.noteId ?? noteSubMatch?.params.noteId ?? null;
  if (resolvedNoteId) {
    return { mode: 'note-aware', noteId: resolvedNoteId, chatId: null };
  }

  return { mode: 'generic', chatId: null, noteId: null };
}
