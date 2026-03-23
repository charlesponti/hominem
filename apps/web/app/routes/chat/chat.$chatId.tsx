import type { SessionSource } from '@hominem/chat-services/types';
import { useChatLifecycle } from '@hominem/chat-services/react';
import { useRpcQuery, useRpcMutation } from '@hominem/rpc/react';
import type { ArtifactType, ChatsGetOutput, ChatsGetMessagesOutput } from '@hominem/rpc/types/chat.types';
import { useToast } from '@hominem/ui';
import { useMemo, useRef, useState } from 'react';

import { ChatHeader } from '~/components/chat/ChatHeader';
import { ChatMessages } from '~/components/chat/ChatMessages';
import { ClassificationReview } from '@hominem/ui/ai-elements';
import { requireAuth } from '~/lib/guards';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import { deriveSessionSource } from '@hominem/chat-services/ui';
import { chatQueryKeys } from '~/lib/query-keys';

import type { Route } from './+types/chat.$chatId';

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
}

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params;
  const { toast } = useToast();
  const sendMessage = useSendMessage({ chatId });
  const status = sendMessage.status ?? 'idle';
  const error = sendMessage.error ?? null;
  const messageControlsRef = useRef<{ showSearch: () => void }>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  const { data: chat } = useRpcQuery(({ chats: c }) => c.get({ chatId }), {
    queryKey: chatQueryKeys.get(chatId),
  });

  const { data: messages } = useRpcQuery(
    ({ chats: c }) => c.getMessages({ chatId, limit: 50 }),
    { queryKey: chatQueryKeys.messages(chatId) },
  );

  const initialSource = useMemo<SessionSource>(
    () =>
      deriveSessionSource({
        artifactId: chat?.noteId ?? null,
        artifactTitle: chat?.title ?? null,
        artifactType: 'note',
        messages: (messages ?? [])
          .filter(
            (m): m is typeof m & { role: 'user' | 'assistant' | 'system' } =>
              m.role === 'user' || m.role === 'assistant' || m.role === 'system',
          )
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    [chat?.noteId, chat?.title, messages],
  );

  const proposalMessages = useMemo(
    () =>
      (messages ?? [])
        .filter(
          (m): m is typeof m & { role: 'user' | 'assistant' | 'system' } =>
            m.role === 'user' || m.role === 'assistant' || m.role === 'system',
        )
        .map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  const classifyMutation = useRpcMutation(
    (client, vars: { targetType: ArtifactType }) =>
      client.chats.classify({ chatId, targetType: vars.targetType }),
  );

  const acceptMutation = useRpcMutation(
    (client, vars: { reviewItemId: string }) =>
      client.review.accept({ reviewItemId: vars.reviewItemId }),
  );

  const rejectMutation = useRpcMutation(
    (client, vars: { reviewItemId: string }) =>
      client.review.reject({ reviewItemId: vars.reviewItemId }),
  );

  const {
    lifecycleState,
    pendingReview,
    resolvedSource,
    isReviewVisible,
    handleTransform,
    handleAcceptReview,
    handleRejectReview,
  } = useChatLifecycle({
    messages: proposalMessages,
    source: initialSource,
    onTransform: async (type) => {
      const result = await classifyMutation.mutateAsync({ targetType: type });
      return result;
    },
    onAcceptReview: async (review) => {
      const { noteId } = await acceptMutation.mutateAsync({
        reviewItemId: review.reviewItemId!,
      });
      return {
        kind: 'artifact' as const,
        id: noteId,
        type: 'note' as const,
        title: review.proposedTitle,
      };
    },
    onRejectReview: async (review) => {
      await rejectMutation.mutateAsync({ reviewItemId: review.reviewItemId! });
    },
    onError: (phase) => {
      toast({
        variant: 'destructive',
        title: phase === 'accept' ? 'Could not save note' : 'Could not prepare note review',
        description: 'Please try again.',
      });
    },
  });

  const messageCount = messages?.length ?? 0;

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
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground pb-(--composer-resting-height,112px)">
      <ChatHeader
        source={resolvedSource}
        lifecycleState={lifecycleState}
        messageCount={messageCount}
        isDebugEnabled={isDebugEnabled}
        onDebugChange={setIsDebugEnabled}
        onOpenSearch={() => messageControlsRef.current?.showSearch()}
        onTransform={handleTransform}
      />

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

      {isReviewVisible && pendingReview && (
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
