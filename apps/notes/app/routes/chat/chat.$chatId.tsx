import type { ArtifactType, SessionSource, ThoughtLifecycleState } from '@hominem/chat-services';
import { deriveSessionSource } from '@hominem/chat-services';
import { useHonoQuery, useHonoMutation } from '@hominem/hono-client/react';
import type {
  ChatsGetOutput,
  ChatsGetMessagesOutput,
  ChatsClassifyOutput,
} from '@hominem/hono-rpc/types/chat.types';
import { useToast } from '@hominem/ui';
import { useMemo, useRef, useState } from 'react';

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
  reviewItemId: string;
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
}

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params;
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [lifecycleState, setLifecycleState] = useState<ThoughtLifecycleState>('idle');
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [overrideSource, setOverrideSource] = useState<SessionSource | null>(null);

  const { data: chat } = useHonoQuery<ChatsGetOutput>(['chats', chatId], ({ chats: c }) =>
    c.get({ chatId }),
  );

  // Same query key as ChatMessages — TanStack Query deduplicates; no extra network request.
  const { data: messages } = useHonoQuery<ChatsGetMessagesOutput>(
    ['chats', 'getMessages', { chatId, limit: 50 }],
    ({ chats: c }) => c.getMessages({ chatId, limit: 50 }),
  );
  const source = useMemo(
    () =>
      overrideSource ??
      deriveSessionSource({
        artifactId: chat?.noteId ?? null,
        artifactTitle: chat?.title ?? null,
        artifactType: 'note',
        messages: (messages ?? [])
          .filter(
            (m): m is typeof m & { role: 'user' | 'assistant' | 'system' } =>
              m.role === 'user' || m.role === 'assistant' || m.role === 'system',
          )
          .map((message) => ({
            role: message.role,
            content: message.content,
          })),
      }),
    [chat?.noteId, chat?.title, messages, overrideSource],
  );
  const messageCount = messages?.length ?? 0;

  const classifyMutation = useHonoMutation<ChatsClassifyOutput, { targetType: ArtifactType }>(
    (client, vars) => client.chats.classify({ chatId, targetType: vars.targetType }),
  );

  const acceptMutation = useHonoMutation<{ noteId: string }, { reviewItemId: string }>(
    (client, vars) => client.review.accept({ reviewItemId: vars.reviewItemId }),
  );

  const rejectMutation = useHonoMutation<{ success: boolean }, { reviewItemId: string }>(
    (client, vars) => client.review.reject({ reviewItemId: vars.reviewItemId }),
  );

  const handleMessageStatusChange = (newStatus: typeof status, newError?: Error | null) => {
    setStatus(newStatus);
    setError(newError || null);
  };

  const handleTransform = async (type: ArtifactType) => {
    setLifecycleState('classifying');
    try {
      const result = await classifyMutation.mutateAsync({ targetType: type });
      setLifecycleState('reviewing_changes');
      setPendingReview({
        reviewItemId: result.reviewItemId,
        proposedType: result.proposedType,
        proposedTitle: result.proposedTitle,
        proposedChanges: result.proposedChanges,
        previewContent: result.previewContent,
      });
    } catch {
      setLifecycleState('idle');
      toast({
        variant: 'destructive',
        title: 'Could not prepare note review',
        description: 'Please try again.',
      });
    }
  };

  const handleAcceptReview = async () => {
    if (!pendingReview) return;
    setLifecycleState('persisting');
    try {
      const { noteId } = await acceptMutation.mutateAsync({
        reviewItemId: pendingReview.reviewItemId,
      });
      setOverrideSource({
        kind: 'artifact',
        id: noteId,
        type: 'note',
        title: pendingReview.proposedTitle,
      });
      setLifecycleState('idle');
      setPendingReview(null);
    } catch {
      setLifecycleState('reviewing_changes');
      toast({
        variant: 'destructive',
        title: 'Could not save note',
        description: 'Please try again.',
      });
    }
  };

  const handleRejectReview = async () => {
    if (!pendingReview) return;
    try {
      await rejectMutation.mutateAsync({ reviewItemId: pendingReview.reviewItemId });
      setLifecycleState('idle');
      setPendingReview(null);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not discard review',
        description: 'Please try again.',
      });
    }
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
        <ChatInput ref={inputRef} chatId={chatId} onStatusChange={handleMessageStatusChange} />
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
