import { deriveSessionSource, toSessionArtifactMessages } from '@hominem/chat-services';
import { useChatSessionController } from '@hominem/chat-services/react';
import type { SessionSource } from '@hominem/chat-services/types';
import { useRpcQuery, useRpcMutation } from '@hominem/rpc/react';
import type { ArtifactType } from '@hominem/rpc/types/chat.types';
import { ClassificationReview } from '@hominem/ui/chat';
import { Chat } from '@hominem/ui/chat';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useArchiveChat } from '~/hooks/use-chats';
import { useServerSpeech } from '~/hooks/use-server-speech';
import { requireAuth } from '~/lib/guards';
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import { chatQueryKeys } from '~/lib/query-keys';

import type { Route } from './+types/chat.$chatId';

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
}

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params;
  const navigate = useNavigate();
  const sendMessage = useSendMessage({ chatId });
  const { mutate: archiveChat, isPending: isArchiving } = useArchiveChat({
    chatId,
    onSuccess: () => navigate('/home'),
  });
  const status = sendMessage.status ?? 'idle';
  const error = sendMessage.error ?? null;
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const {
    messages,
    isLoading,
    error: messagesError,
    deleteMessage,
    updateMessage,
  } = useChatMessages({ chatId });
  const voiceTtsServerEnabled = useFeatureFlag('voiceTtsServer', true);
  const { speakingId, loadingId, errorMessage: speechErrorMessage, speak } = useServerSpeech();

  const { data: chat } = useRpcQuery(({ chats }) => chats.get({ chatId }), {
    queryKey: chatQueryKeys.get(chatId),
  });

  const initialSource = useMemo<SessionSource>(
    () =>
      deriveSessionSource({
        artifactId: chat?.noteId ?? null,
        artifactTitle: chat?.title ?? null,
        artifactType: 'note',
        messages: toSessionArtifactMessages(messages ?? [], (message) => message.content),
      }),
    [chat?.noteId, chat?.title, messages],
  );

  const classifyMutation = useRpcMutation(({ chats }, vars: { targetType: ArtifactType }) =>
    chats.classify({ chatId, targetType: vars.targetType }),
  );

  const acceptMutation = useRpcMutation(({ review }, vars: { reviewItemId: string }) =>
    review.accept({ reviewItemId: vars.reviewItemId }),
  );

  const rejectMutation = useRpcMutation(({ review }, vars: { reviewItemId: string }) =>
    review.reject({ reviewItemId: vars.reviewItemId }),
  );

  const sessionController = useChatSessionController({
    messages: (messages ?? [])
      .filter(
        (message): message is typeof message & { role: 'user' | 'assistant' | 'system' } =>
          message.role === 'user' || message.role === 'assistant' || message.role === 'system',
      )
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      })),
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
      console.error(
        '[chat]',
        phase === 'accept' ? 'Could not save note' : 'Could not prepare note review',
      );
    },
    onArchive: async () => {
      await archiveChat({ chatId });
    },
    onDeleteMessage: async (messageId) => {
      await deleteMessage(messageId);
    },
    onSendMessage: async (message) => {
      await sendMessage.mutateAsync({ message, chatId });
    },
    onUpdateMessage: async (messageId, content) => {
      await updateMessage(messageId, content);
    },
  });

  useChatKeyboardShortcuts({
    onScrollToTop: () => {},
    onScrollToBottom: () => {},
    enabled: true,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-(--color-bg-base) text-(--color-text-primary)">
      <Chat
        source={sessionController.resolvedSource}
        resolvedSource={sessionController.resolvedSource}
        statusCopy={sessionController.statusCopy}
        topInset={0}
        renderIcon={() => null}
        messages={messages ?? []}
        status={status}
        isLoading={isLoading}
        error={messagesError || error}
        showDebug={isDebugEnabled}
        speakingId={speakingId}
        speechLoadingId={loadingId}
        speechErrorMessage={speechErrorMessage}
        canTransform={sessionController.canTransform}
        isDebugEnabled={isDebugEnabled}
        isArchiving={isArchiving}
        onDebugChange={setIsDebugEnabled}
        onTransform={sessionController.handleTransform}
        onArchive={() => {
          void sessionController.handleArchive();
        }}
        onDelete={async (messageId: string) => {
          try {
            await sessionController.handleDeleteMessage(messageId);
          } catch (err) {
            console.error('[chat] Could not delete message', err);
          }
        }}
        onEdit={async (messageId: string, newContent: string) => {
          try {
            await sessionController.handleEditMessage(messageId, newContent);
          } catch (err) {
            console.error('[chat] Could not edit message', err);
          }
        }}
        onRegenerate={async (messageId: string) => {
          try {
            await sessionController.handleRegenerateMessage(messageId);
          } catch (err) {
            console.error('[chat] Could not regenerate message', err);
          }
        }}
        onSpeak={async (messageId: string, content: string) => {
          if (!voiceTtsServerEnabled) return;
          await speak(messageId, content);
        }}
      />

      {sessionController.isReviewVisible && sessionController.pendingReview && (
        <ClassificationReview
          proposedType={sessionController.pendingReview.proposedType}
          proposedTitle={sessionController.pendingReview.proposedTitle}
          proposedChanges={sessionController.pendingReview.proposedChanges}
          previewContent={sessionController.pendingReview.previewContent}
          onAccept={sessionController.handleAcceptReview}
          onReject={sessionController.handleRejectReview}
        />
      )}
    </div>
  );
}
