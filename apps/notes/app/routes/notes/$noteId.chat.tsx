import { useRef, useState } from 'react';
import { type LoaderFunctionArgs, redirect } from 'react-router';

import { ChatInput } from '~/components/chat/ChatInput';
import { ChatMessages } from '~/components/chat/ChatMessages';
import { requireAuth } from '~/lib/guards';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const { noteId } = params;

  if (!noteId) {
    return redirect('/notes');
  }

  return { noteId };
}

export default function NoteChatPage({ loaderData }: { loaderData: { noteId: string } }) {
  const { noteId } = loaderData;
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [chatId, _setChatId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesComponentRef = useRef<{ showSearch: () => void }>(null);

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

  return (
    <div className="flex flex-col size-full mx-auto text-foreground">
      <div className="flex-1" ref={messagesRef}>
        {chatId ? (
          <ChatMessages ref={messagesComponentRef} chatId={chatId} status={status} error={error} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-muted-foreground mb-4">Start chatting about this note</p>
            <p className="text-sm text-muted-foreground">Note ID: {noteId}</p>
          </div>
        )}
      </div>

      <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <ChatInput
          ref={inputRef}
          chatId={chatId || ''}
          onStatusChange={handleMessageStatusChange}
        />
      </div>
    </div>
  );
}
