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
  primaryActionIcon: 'circle-plus' | 'arrow-up';
  secondaryActionLabel: string;
  secondaryActionIcon: 'message-square' | 'circle-plus';
  showsAttachmentButton: boolean;
  showsVoiceButton: boolean;
  showsNotePicker: boolean;
}

export function deriveComposerPresentation(
  mode: ComposerMode,
  isRecording = false,
): ComposerPresentation {
  if (mode === 'note-aware') {
    return {
      posture: 'note-query',
      placeholder: 'Ask about this note…',
      primaryActionLabel: 'Ask',
      primaryActionIcon: 'arrow-up',
      secondaryActionLabel: '',
      secondaryActionIcon: 'message-square',
      showsAttachmentButton: false,
      showsVoiceButton: true,
      showsNotePicker: false,
    };
  }

  if (mode === 'chat-continuation') {
    return {
      posture: 'reply',
      placeholder: isRecording ? 'Listening…' : 'Reply in chat',
      primaryActionLabel: 'Send',
      primaryActionIcon: 'arrow-up',
      secondaryActionLabel: 'Save as note',
      secondaryActionIcon: 'circle-plus',
      showsAttachmentButton: true,
      showsVoiceButton: true,
      showsNotePicker: true,
    };
  }

  // generic — home / focus route
  return {
    posture: 'capture',
    placeholder: isRecording ? 'Listening…' : 'Write a note, ask something, or drop a file',
    primaryActionLabel: 'Save note',
    primaryActionIcon: 'circle-plus',
    secondaryActionLabel: 'Start chat',
    secondaryActionIcon: 'message-square',
    showsAttachmentButton: true,
    showsVoiceButton: true,
    showsNotePicker: false,
  };
}
