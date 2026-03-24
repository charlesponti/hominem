import { useChatLifecycle } from '@hominem/chat-services/react';
import type { SessionSource } from '@hominem/chat-services/types';
import { deriveSessionSource } from '@hominem/chat-services/ui';
import { useRpcQuery, useRpcMutation } from '@hominem/rpc/react';
import type { ArtifactType } from '@hominem/rpc/types/chat.types';
import { useToast } from '@hominem/ui';
import { ClassificationReview } from '@hominem/ui/ai-elements';
import { Chat } from '@hominem/ui/chat';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useArchiveChat } from '~/hooks/use-chats';
import { useServerSpeech } from '~/hooks/use-server-speech';
import { useVoiceMode } from '~/hooks/use-voice-mode';
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
  const { toast } = useToast();
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
  const voiceModeEnabled = useFeatureFlag('voiceMode', true);
  const { speakingId, loadingId, errorMessage: speechErrorMessage, speak } = useServerSpeech();
  const {
    isActive: isVoiceModeActive,
    state: voiceModeState,
    error: voiceModeError,
    startRecording: startVoiceModeRecording,
    stopRecording: stopVoiceModeRecording,
    activate: activateVoiceMode,
    deactivate: deactivateVoiceMode,
  } = useVoiceMode();
  const [isVoiceModeRecording, setIsVoiceModeRecording] = useState(false);

  const { data: chat } = useRpcQuery(({ chats }) => chats.get({ chatId }), {
    queryKey: chatQueryKeys.get(chatId),
  });

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

  const classifyMutation = useRpcMutation(({ chats }, vars: { targetType: ArtifactType }) =>
    chats.classify({ chatId, targetType: vars.targetType }),
  );

  const acceptMutation = useRpcMutation(({ review }, vars: { reviewItemId: string }) =>
    review.accept({ reviewItemId: vars.reviewItemId }),
  );

  const rejectMutation = useRpcMutation(({ review }, vars: { reviewItemId: string }) =>
    review.reject({ reviewItemId: vars.reviewItemId }),
  );

  const {
    pendingReview,
    resolvedSource,
    isReviewVisible,
    canTransform,
    statusCopy,
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

  useChatKeyboardShortcuts({
    onScrollToTop: () => {},
    onScrollToBottom: () => {},
    enabled: true,
  });

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground pb-(--composer-resting-height,112px)">
      <Chat
        source={resolvedSource}
        resolvedSource={resolvedSource}
        statusCopy={statusCopy}
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
        isVoiceModeActive={voiceModeEnabled ? isVoiceModeActive : false}
        voiceModeState={voiceModeState}
        voiceModeErrorMessage={voiceModeError?.message ?? null}
        isVoiceModeRecording={isVoiceModeRecording}
        canTransform={canTransform}
        isDebugEnabled={isDebugEnabled}
        isArchiving={isArchiving}
        onDebugChange={setIsDebugEnabled}
        onTransform={handleTransform}
        onToggleVoiceMode={() => {
          if (!voiceModeEnabled) return;

          if (isVoiceModeActive) {
            setIsVoiceModeRecording(false);
            deactivateVoiceMode();
            return;
          }

          activateVoiceMode();
        }}
        onStartVoiceModeRecording={async () => {
          if (!voiceModeEnabled) return;
          await startVoiceModeRecording();
          setIsVoiceModeRecording(true);
        }}
        onStopVoiceModeRecording={async () => {
          if (!voiceModeEnabled) return;
          await stopVoiceModeRecording();
          setIsVoiceModeRecording(false);
        }}
        onArchive={() => archiveChat({ chatId })}
        onDelete={async (messageId: string) => {
          try {
            await deleteMessage(messageId);
          } catch {
            toast({
              variant: 'destructive',
              title: 'Could not delete message',
              description: 'Please try again.',
            });
          }
        }}
        onEdit={async (messageId: string, newContent: string) => {
          try {
            await updateMessage(messageId, newContent);
            await sendMessage.mutateAsync({ message: newContent, chatId });
          } catch {
            toast({
              variant: 'destructive',
              title: 'Could not edit message',
              description: 'Please try again.',
            });
          }
        }}
        onRegenerate={async (messageId: string) => {
          try {
            const messageIndex = (messages ?? []).findIndex((message) => message.id === messageId);
            if (messageIndex === -1) return;
            const previousUserMessage = (messages ?? [])
              .slice(0, messageIndex)
              .reverse()
              .find((message) => message.role === 'user');
            if (!previousUserMessage) return;
            await deleteMessage(messageId);
            await sendMessage.mutateAsync({ message: previousUserMessage.content || '', chatId });
          } catch {
            toast({
              variant: 'destructive',
              title: 'Could not regenerate message',
              description: 'Please try again.',
            });
          }
        }}
        onSpeak={async (messageId: string, content: string) => {
          if (!voiceTtsServerEnabled) return;
          await speak(messageId, content);
        }}
      />

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
