import type { ComposerProps } from '~/components/composer/Composer';

import type { ComposerSubmitKind } from './useComposerSubmission';

export function getComposerSubmissionConfig(props: ComposerProps) {
  const isInbox = props.mode === 'inbox';
  const entryMode = isInbox ? (props.entryMode ?? 'mixed') : undefined;
  const isChatEntryMode = isInbox && entryMode === 'chat';

  return {
    entryMode,
    inputTestID: isInbox ? 'inbox-composer-input' : 'chat-composer-input',
    isChatEntryMode,
    isChatMode: props.mode === 'chat',
    primarySubmitKind: (isChatEntryMode
      ? 'start-chat'
      : isInbox
        ? 'note'
        : 'message') as ComposerSubmitKind,
    secondarySubmitKind: (isInbox ? (isChatEntryMode ? 'note' : 'start-chat') : undefined) as
      | ComposerSubmitKind
      | undefined,
    shellTestID: props.testID ?? (isInbox ? 'inbox-composer' : 'chat-composer'),
  };
}
