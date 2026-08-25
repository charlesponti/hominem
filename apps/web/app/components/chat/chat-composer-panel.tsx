import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { useCallback, useEffect } from 'react';

import { ChatComposer } from '~/components/chat/chat-composer';
import { getAutomaticChatTitle } from '~/lib/chat/chat-title';
import { useChatComposerState } from '~/lib/hooks/use-chat-composer-state';
import type { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import type { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import type { useResponseLength } from '~/lib/hooks/use-response-length';
import { useSpeechToText } from '~/lib/hooks/use-speech-to-text';
import type { useStreamMessage } from '~/lib/hooks/use-stream-message';

type SeedNote = {
  id: string;
  title?: string | null;
  excerpt?: string | null;
};

interface ChatComposerPanelProps {
  chatId: string;
  currentChatTitle?: string;
  display: ReturnType<typeof useChatDisplayMessages>;
  isOnline: boolean;
  isRetryable: boolean;
  regeneration: ReturnType<typeof useRegenerateMessage>;
  responseLength: ReturnType<typeof useResponseLength>['responseLength'];
  seedNote: SeedNote | null;
  setIsRetryable: (value: boolean) => void;
  streamMessage: ReturnType<typeof useStreamMessage>;
  updateChatTitle: { mutate: (input: { chatId: string; title: string }) => void };
}

export function ChatComposerPanel({
  chatId,
  currentChatTitle,
  display,
  isOnline,
  isRetryable,
  regeneration,
  responseLength,
  seedNote,
  setIsRetryable,
  streamMessage,
  updateChatTitle,
}: ChatComposerPanelProps) {
  const composer = useChatComposerState({ seedNote });
  const speech = useSpeechToText({ onTranscript: composer.setDraft });
  const { setPendingAssistantMessage } = display;

  useEffect(() => {
    if (
      !streamMessage.isStreaming ||
      (!streamMessage.text && !streamMessage.reasoning && streamMessage.toolSteps.length === 0)
    ) {
      return;
    }

    const now = new Date().toISOString();
    setPendingAssistantMessage({
      id: `stream-${chatId}`,
      chatId,
      userId: '',
      role: 'assistant',
      content: streamMessage.text,
      files: null,
      referencedNotes: null,
      toolCalls: streamMessage.toolSteps.map((step) => ({
        toolName: step.toolName,
        type: 'tool-call' as const,
        toolCallId: step.toolCallId,
        args: {},
      })),
      reasoning: streamMessage.reasoning || null,
      parentMessageId: null,
      createdAt: now,
      updatedAt: now,
      isStreaming: true,
    } as ChatMessageDto);
  }, [
    chatId,
    setPendingAssistantMessage,
    streamMessage.isStreaming,
    streamMessage.reasoning,
    streamMessage.text,
    streamMessage.toolSteps,
  ]);

  const handleSend = useCallback(async () => {
    if (
      !isOnline ||
      streamMessage.isStreaming ||
      streamMessage.status === 'stopping' ||
      regeneration.isRegenerating ||
      (composer.draftWithSeed.trim().length === 0 &&
        composer.attachedFiles.length === 0 &&
        composer.selectedNotesForSend.length === 0)
    ) {
      return;
    }
    if (speech.isListening) speech.stop();

    const messageToSend = composer.draftWithSeed;
    const filesToSend = composer.attachedFiles;
    const notesToSend = composer.selectedNotesForSend;
    const selectedNotesToRestore = composer.selectedNotes;
    let accepted = false;
    setIsRetryable(false);

    const now = new Date().toISOString();
    display.setOptimisticUserMessage({
      id: `optimistic-${crypto.randomUUID()}`,
      chatId,
      userId: '',
      role: 'user',
      content: messageToSend,
      files: null,
      referencedNotes: notesToSend.length
        ? notesToSend.map((note) => ({ id: note.id, title: note.title ?? null }))
        : null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: now,
      updatedAt: now,
    } as ChatMessageDto);
    display.setPendingAssistantMessage(null);
    composer.clear();

    await streamMessage.stream({
      message: messageToSend,
      fileIds: filesToSend.map((file) => file.id),
      noteIds: notesToSend.map((note) => note.id),
      responseLength,
      onAccepted: (userMessage) => {
        accepted = true;
        setIsRetryable(false);
        if (userMessage) display.setOptimisticUserMessage(userMessage);
        const title = getAutomaticChatTitle(userMessage?.content ?? '');
        if (currentChatTitle === 'New chat' && title) {
          updateChatTitle.mutate({ chatId, title });
        }
      },
      onCommitted: (message) => display.setPendingAssistantMessage(message),
      onCancelled: () => {
        composer.setDraft(messageToSend);
        if (!accepted) setIsRetryable(true);
      },
      onFailed: () => {
        composer.restore({
          attachments: filesToSend,
          draft: messageToSend,
          notes: selectedNotesToRestore,
        });
        if (!accepted) setIsRetryable(true);
      },
    });

    display.setOptimisticUserMessage(null);
    display.setPendingAssistantMessage(null);
  }, [
    chatId,
    composer,
    currentChatTitle,
    display,
    isOnline,
    regeneration.isRegenerating,
    responseLength,
    setIsRetryable,
    speech,
    streamMessage,
    updateChatTitle,
  ]);

  return (
    <ChatComposer
      attachments={composer.attachedFiles}
      contextContent={
        composer.suggestions.length > 0 || composer.selectedNotesForSend.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {composer.selectedNotesForSend.map((note) => (
              <span
                key={note.id}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {note.title || 'Untitled'}
              </span>
            ))}
            {composer.suggestions.map((note) => (
              <button
                key={note.id}
                type="button"
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                onClick={() => composer.selectSuggestion(note)}
              >
                {note.title || 'Untitled'}
              </button>
            ))}
          </div>
        ) : null
      }
      draft={composer.draft}
      error={
        !isOnline
          ? 'You are offline. Your draft and attachments are preserved.'
          : composer.uploadState.errors.length > 0
            ? composer.uploadState.errors.join(', ')
            : streamMessage.error?.message
      }
      hasContext={composer.selectedNotesForSend.length > 0}
      isOffline={!isOnline}
      isSubmitting={
        streamMessage.isStreaming ||
        streamMessage.status === 'stopping' ||
        regeneration.isRegenerating
      }
      isStreaming={streamMessage.isStreaming}
      isVoiceSupported={speech.isSupported}
      isListening={speech.isListening}
      onAttachFiles={(files) => void composer.attachFiles(files)}
      onChangeDraft={composer.setDraft}
      onRemoveAttachment={composer.removeAttachment}
      onStop={() => void streamMessage.cancel()}
      onSubmit={() => void handleSend()}
      onRetry={isRetryable && isOnline ? () => void handleSend() : undefined}
      onToggleVoice={() => speech.toggle(composer.draft)}
    />
  );
}
