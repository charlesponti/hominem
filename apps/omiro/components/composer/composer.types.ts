interface ComposerInboxProps {
  mode: 'inbox';
  initialMessage?: string;
  onDraftChange?: (msg: string) => void;
  onClearDraft?: () => void;
  entryMode?: 'mixed' | 'note' | 'chat';
  onComplete?: () => void;
  testID?: string;
}

interface ComposerChatProps {
  mode: 'chat';
  chatId: string;
  testID?: string;
}

export type ComposerProps = ComposerInboxProps | ComposerChatProps;

export type ComposerSubmitKind = 'note' | 'start-chat' | 'message';
