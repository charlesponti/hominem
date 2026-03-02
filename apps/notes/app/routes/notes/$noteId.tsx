import { type LoaderFunctionArgs, redirect } from 'react-router';
import { useRef, useState } from 'react';

import { ChatInput } from '~/components/chat/ChatInput';
import { ChatMessages } from '~/components/chat/ChatMessages';
import { requireAuth } from '~/lib/guards';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';
import { useNote } from '~/hooks/use-notes';
import { useNoteChat } from '~/hooks/use-note-chat';

import { SplitPane } from './components/split-pane';
import { NoteEditor } from './components/note-editor';

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const { noteId } = params;

  if (!noteId) {
    return redirect('/notes');
  }

  return { noteId };
}

export default function NoteSplitView({ loaderData }: { loaderData: { noteId: string } }) {
  const { noteId } = loaderData;
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesComponentRef = useRef<{ showSearch: () => void }>(null);

  const { data: note, isLoading: isNoteLoading } = useNote(noteId);
  const { data: chat, isLoading: isChatLoading } = useNoteChat(noteId);

  const handleMessageStatusChange = (newStatus: typeof status, newError?: Error | null) => {
    setStatus(newStatus);
    setError(newError || null);
  };

  useChatKeyboardShortcuts({
    onFocusInput: () => {
      inputRef.current?.focus();
    },
    onScrollToTop: () => {
      messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onScrollToBottom: () => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    },
    enabled: true,
  });

  const handleAIAction = (action: string) => {
    console.log('AI Action:', action, note?.content);
  };

  if (isNoteLoading || isChatLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Note not found</p>
      </div>
    );
  }

  const leftPanel = <NoteEditor note={note} chatId={chat?.id || ''} onAIAction={handleAIAction} />;

  const rightPanel = (
    <div className="flex flex-col h-full">
      <div className="flex-1" ref={messagesRef}>
        {chat ? (
          <ChatMessages
            ref={messagesComponentRef}
            chatId={chat.id}
            status={status}
            error={error}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-muted-foreground">
              Chat not available
            </p>
          </div>
        )}
      </div>
      {chat && (
        <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
          <ChatInput
            ref={inputRef}
            chatId={chat.id}
            onStatusChange={handleMessageStatusChange}
          />
        </div>
      )}
    </div>
  );

  return <SplitPane leftPanel={leftPanel} rightPanel={rightPanel} />;
}
