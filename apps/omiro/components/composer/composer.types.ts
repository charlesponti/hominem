// Props are keyed by `mode` because the composer's whole behavior forks on it:
// inbox mode saves notes/starts chats and takes its draft from the caller,
// chat mode sends messages and manages its own draft (see useComposerSubmission).
interface ComposerInboxProps {
  mode: 'inbox';
  initialMessage?: string;
  onDraftChange?: (msg: string) => void;
  onClearDraft?: () => void;
  entryMode?: 'mixed' | 'note' | 'chat';
  onComplete?: () => void;
  testID?: string;
}

interface ComposerChatSend {
  sendChatMessage: (input: {
    message: string;
    fileIds?: string[];
    noteIds?: string[];
    responseModality?: 'text' | 'audio';
  }) => Promise<void>;
  isChatSending: boolean;
}

interface ComposerChatProps {
  mode: 'chat';
  chatId: string;
  testID?: string;
  // Owned by the screen (ChatDetailScreen) and shared with the message list's
  // retry action, so sending and retrying a failed message share one
  // in-flight mutation instead of racing two independent streams.
  chatSend: ComposerChatSend;
}

export type ComposerProps = ComposerInboxProps | ComposerChatProps;

export type ComposerSubmitKind = 'note' | 'start-chat' | 'message';
export type ComposerEntryKind = 'chat' | 'note';
