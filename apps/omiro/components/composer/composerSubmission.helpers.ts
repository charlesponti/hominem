import type { ComposerProps, ComposerSubmitKind } from '~/components/composer/composer.types';
import t from '~/translations';

export interface ComposerPresentation {
  inputTestID: string;
  shellTestID: string;
  placeholder: string;
  primarySubmitKind: ComposerSubmitKind;
  submitTestID: string;
  submitAccessibilityLabel: string | undefined;
}

// Pure presentation mapping from mode/entryMode to copy, test IDs, and which
// submit action is primary. Kept separate from the actual submit logic in
// useComposerSubmission.ts so "what the button says" and "what it does" can
// change independently.
export function getComposerSubmissionConfig(
  props: ComposerProps,
  selectedEntryKind?: 'chat' | 'note',
): ComposerPresentation {
  const isInbox = props.mode === 'inbox';
  const entryMode = isInbox ? (selectedEntryKind ?? props.entryMode ?? 'mixed') : undefined;
  const isChatEntryMode = isInbox && entryMode === 'chat';
  const isNewChat = isInbox && props.presentation === 'new-chat';

  if (!isInbox) {
    return {
      inputTestID: 'chat-composer-input',
      shellTestID: props.testID ?? 'chat-composer',
      placeholder: t.chat.input.messagePlaceholder,
      primarySubmitKind: 'message',
      submitTestID: 'composer-submit-message',
      submitAccessibilityLabel: undefined,
    };
  }

  return {
    inputTestID: isNewChat ? 'new-chat-composer-input' : 'inbox-composer-input',
    shellTestID: props.testID ?? (isNewChat ? 'new-chat-composer' : 'inbox-composer'),
    placeholder: isChatEntryMode
      ? t.chat.input.messagePlaceholder
      : t.inboxComposer.composer.placeholder,
    primarySubmitKind: isChatEntryMode ? 'start-chat' : 'note',
    submitTestID: isChatEntryMode
      ? isNewChat
        ? 'new-chat-submit'
        : 'composer-submit-chat'
      : 'composer-submit-note',
    submitAccessibilityLabel: isChatEntryMode
      ? t.inbox.screen.startChatSubmitA11y
      : t.inboxComposer.composer.saveNoteA11y,
  };
}
