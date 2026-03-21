import type {
  SessionSource,
  ThoughtLifecycleState,
} from '@hominem/chat-services/types';
import { deriveSessionSource } from '@hominem/chat-services/types';
import { useHonoQuery, useHonoMutation } from '@hominem/rpc/react';
import type {
  ArtifactType,
  ChatsGetOutput,
  ChatsGetMessagesOutput,
} from '@hominem/rpc/types/chat.types';
import { useToast } from '@hominem/ui';
import { useMemo, useRef, useState } from 'react';

import { ChatHeader } from '~/components/chat/ChatHeader';
import { ChatMessages } from '~/components/chat/ChatMessages';
import { ClassificationReview } from '@hominem/ui/ai-elements';
import { requireAuth } from '~/lib/guards';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';
import { useSendMessage } from '~/lib/hooks/use-send-message';

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

interface ChatsReviewOutput {
  reviewItemId: string
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
}

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params;
  const { toast } = useToast();
  const sendMessage = useSendMessage({ chatId });
  const status = sendMessage.status ?? 'idle';
  const error = sendMessage.error ?? null;
  const messageControlsRef = useRef<{ showSearch: () => void }>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [lifecycleState, setLifecycleState] = useState<ThoughtLifecycleState>('idle');
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [overrideSource, setOverrideSource] = useState<SessionSource | null>(null);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  const { data: chat } = useHonoQuery<ChatsGetOutput>(['chats', chatId], ({ chats: c }) =>
    c.get({ chatId }),
  );

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

  const classifyMutation = useHonoMutation<ChatsReviewOutput, { targetType: ArtifactType }>(
    (client, vars) => client.chats.classify({ chatId, targetType: vars.targetType }),
  );

  const acceptMutation = useHonoMutation<{ noteId: string }, { reviewItemId: string }>(
    (client, vars) => client.review.accept({ reviewItemId: vars.reviewItemId }),
  );

  const rejectMutation = useHonoMutation<{ success: boolean }, { reviewItemId: string }>(
    (client, vars) => client.review.reject({ reviewItemId: vars.reviewItemId }),
  );

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

  useChatKeyboardShortcuts({
    onScrollToTop: () => {
      messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onScrollToBottom: () => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    },
    enabled: true,
  });

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground pb-[var(--composer-resting-height,112px)]">
      {/* Sticky chat header */}
      <ChatHeader
        source={source}
        lifecycleState={lifecycleState}
        messageCount={messageCount}
        isDebugEnabled={isDebugEnabled}
        onDebugChange={setIsDebugEnabled}
        onOpenSearch={() => messageControlsRef.current?.showSearch()}
        onTransform={handleTransform}
      />

      {/* Scrollable message list */}
      <div className="min-h-0 flex-1 overflow-hidden" ref={messagesRef}>
        <ChatMessages
          ref={messageControlsRef}
          chatId={chatId}
          status={status}
          error={error}
          showDebug={isDebugEnabled}
          lifecycleState={lifecycleState}
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
