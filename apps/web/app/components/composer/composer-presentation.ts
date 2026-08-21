/**
 * Composer presentation derivation
 *
 * Web equivalent of mobile's deriveMobileComposerPresentation.
 * Posture + copy + button visibility are derived from the route-based
 * ComposerMode — no component state required.
 *
 * Posture:
 *   capture   — home/focus route (create note or start chat)
 *   draft     — note detail (extend the open note)
 *   reply     — chat detail (reply to conversation)
 *   hidden    — any route where the composer should not render
 */

import type { ComposerMode } from './composer-provider';

export type ComposerPosture = 'capture' | 'draft' | 'reply' | 'note-query' | 'hidden';

export interface ComposerPresentation {
  posture: ComposerPosture;
  placeholder: string;
  primaryActionLabel: string;
  /** Icon name understood by the Composer — kept symbolic so the component picks the icon */
  primaryActionIcon: 'plus.circle' | 'arrow.up';
  secondaryActionLabel: string;
  secondaryActionIcon: 'bubble.left' | 'plus.circle';
  showsAttachmentButton: boolean;
  showsNotePicker: boolean;
}

export function deriveComposerPresentation(mode: ComposerMode): ComposerPresentation {
  if (mode === 'note-aware') {
    return {
      posture: 'note-query',
      placeholder: 'Ask about this note…',
      primaryActionLabel: 'Ask',
      primaryActionIcon: 'arrow.up',
      secondaryActionLabel: '',
      secondaryActionIcon: 'bubble.left',
      showsAttachmentButton: false,
      showsNotePicker: false,
    };
  }

  if (mode === 'chat-continuation') {
    return {
      posture: 'reply',
      placeholder: 'Reply in chat',
      primaryActionLabel: 'Send',
      primaryActionIcon: 'arrow.up',
      secondaryActionLabel: 'Save as note',
      secondaryActionIcon: 'plus.circle',
      showsAttachmentButton: true,
      showsNotePicker: true,
    };
  }

  // generic — home / focus route
  return {
    posture: 'capture',
    placeholder: 'Write a note, ask something, or drop a file',
    primaryActionLabel: 'Save note',
    primaryActionIcon: 'plus.circle',
    secondaryActionLabel: 'Start chat',
    secondaryActionIcon: 'bubble.left',
    showsAttachmentButton: true,
    showsNotePicker: false,
  };
}
