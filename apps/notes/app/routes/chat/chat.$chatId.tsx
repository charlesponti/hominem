import { useRef, useState } from 'react';

import type { ChatsGetOutput, ChatsGetMessagesOutput } from '@hominem/hono-rpc/types/chat.types';
import type { ArtifactType, SessionSource, ThoughtLifecycleState } from '@hominem/chat-services';
import { useHonoQuery } from '@hominem/hono-client/react';
import { ArtifactActions } from '~/components/artifact-actions';
import { ChatInput } from '~/components/chat/ChatInput';
import { ChatMessages } from '~/components/chat/ChatMessages';
import { ClassificationReview } from '~/components/classification-review';
import { ContextAnchor } from '~/components/context-anchor';
import { requireAuth } from '~/lib/guards';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';

import type { Route } from './+types/chat.$chatId';

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
}

interface PendingReview {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
}

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params;
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [lifecycleState, setLifecycleState] = useState<ThoughtLifecycleState>('idle');
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);

  const { data: chat } = useHonoQuery<ChatsGetOutput>(
    ['chats', chatId],
    ({ chats: c }) => c.get({ chatId }),
  );

  const source: SessionSource = chat?.noteId
    ? { kind: 'artifact', id: chat.noteId, type: 'note', title: chat.title }
    : { kind: 'new' };

  // Same query key as ChatMessages — TanStack Query deduplicates; no extra network request.
  const { data: messages } = useHonoQuery<ChatsGetMessagesOutput>(
    ['chats', 'getMessages', { chatId, limit: 50 }],
    ({ chats: c }) => c.getMessages({ chatId, limit: 50 }),
  );
  const messageCount = messages?.length ?? 0;

  const handleMessageStatusChange = (newStatus: typeof status, newError?: Error | null) => {
    setStatus(newStatus);
    setError(newError || null);
  };

  // Phase 7: classification API not yet implemented.
  // Passes through 'classifying' so ArtifactActions dim state renders before the review dialog.
  const handleTransform = (_type: ArtifactType) => {
    setLifecycleState('classifying');
    queueMicrotask(() => {
      setLifecycleState('reviewing_changes');
      setPendingReview({
        proposedType: 'note',
        proposedTitle: 'Untitled note',
        proposedChanges: ['Classification API not yet implemented'],
        previewContent: '',
      });
    });
  };

  const handleAcceptReview = () => {
    setLifecycleState('idle');
    setPendingReview(null);
  };

  const handleRejectReview = () => {
    setLifecycleState('idle');
    setPendingReview(null);
  };

  // Keyboard shortcuts
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
      <div className="flex items-center px-4 py-2 border-b border-border">
        <ContextAnchor source={source} />
      </div>

      <div className="flex-1" ref={messagesRef}>
        <ChatMessages chatId={chatId} status={status} error={error} />
      </div>

      <ArtifactActions
        state={lifecycleState}
        messageCount={messageCount}
        onTransform={handleTransform}
      />

      <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <ChatInput
          ref={inputRef}
          chatId={chatId}
          onStatusChange={handleMessageStatusChange}
        />
      </div>

      {lifecycleState === 'reviewing_changes' && pendingReview && (
        <ClassificationReview
          proposedType={pendingReview.proposedType}
          proposedTitle={pendingReview.proposedTitle}
          proposedChanges={pendingReview.proposedChanges}
          previewContent={pendingReview.previewContent}
          onAccept={handleAcceptReview}
          onReject={handleRejectReview}
        />
      )}
    </div>
  );
}
