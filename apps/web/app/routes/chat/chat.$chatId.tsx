import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { useCallback, useEffect, useState } from 'react';
import { data, useNavigate } from 'react-router';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation';
import { Message, MessageContent } from '~/components/ai-elements/message';
import { preloadPersona } from '~/components/ai-elements/persona';
import { Shimmer } from '~/components/ai-elements/shimmer';
import { ChatComposer } from '~/components/chat/chat-composer';
import { ChatConversationActions } from '~/components/chat/chat-conversation-actions';
import { ChatMessage as ChatMessageView } from '~/components/chat/chat-message';
import { ChatMessageSearch } from '~/components/chat/chat-message-search';
import { ChatResponseSettings } from '~/components/chat/chat-response-settings';
import { ErrorState } from '~/components/error-state';
import { RouteHeader } from '~/components/route-header';
import { useArchiveChat } from '~/hooks/use-chats';
import { serverEnv } from '~/lib/env.server';
import { useChatComposerState } from '~/lib/hooks/use-chat-composer-state';
import { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import { useChatMessageSearch } from '~/lib/hooks/use-chat-message-search';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useOnlineStatus } from '~/lib/hooks/use-online-status';
import { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import { useResponseLength } from '~/lib/hooks/use-response-length';
import { useSpeechToText } from '~/lib/hooks/use-speech-to-text';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';
import { useToolCallRespond } from '~/lib/hooks/use-tool-call-respond';

import type { Route } from './+types/chat.$chatId';

type ChatMessageLoaderData = ChatMessageDto[];

type NoteLoaderData = {
  id: string;
  title?: string | null;
  excerpt?: string | null;
};

function getSpeechUrl(chatId: string, messageId: string) {
  return `${import.meta.env.VITE_PUBLIC_API_URL}/api/chats/${chatId}/messages/${messageId}/speech`;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;

  const messagesResponse = await fetch(
    new URL(
      `/api/chats/${params.chatId}/messages?limit=50`,
      serverEnv.HOMINEM_INTERNAL_API_URL,
    ).toString(),
    { headers },
  );
  const messages = messagesResponse.ok
    ? ((await messagesResponse.json()) as ChatMessageLoaderData)
    : undefined;

  const noteId = new URL(request.url).searchParams.get('noteId');
  let seedNote: NoteLoaderData | null = null;
  if (noteId) {
    const noteResponse = await fetch(
      new URL(`/api/notes/${noteId}`, serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
      { headers },
    );
    seedNote = noteResponse.ok ? ((await noteResponse.json()) as NoteLoaderData) : null;
  }

  return data({ seedNote, messages, messagesStatus: messagesResponse.status });
}

export default function ChatPage({
  loaderData,
  params,
}: {
  loaderData: {
    seedNote: NoteLoaderData | null;
    messages?: ChatMessageLoaderData;
    messagesStatus: number;
  };
  params: { chatId: string };
}) {
  const { seedNote, messages: initialMessages, messagesStatus } = loaderData;
  const { chatId } = params;
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [isRetryable, setIsRetryable] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);

  const activateSpeech = useCallback((messageId: string) => {
    setActiveSpeechMessageId(messageId);
  }, []);

  const deactivateSpeech = useCallback((messageId: string) => {
    setActiveSpeechMessageId((activeMessageId) =>
      activeMessageId === messageId ? null : activeMessageId,
    );
  }, []);

  useEffect(() => {
    preloadPersona();
  }, []);

  const {
    messages,
    error: messagesError,
    isNotFound,
    retry,
    deleteMessage,
    isDeleting,
    updateMessage,
  } = useChatMessages({
    chatId,
    ...(initialMessages ? { initialData: initialMessages } : {}),
  });
  const streamMessage = useStreamMessage({ chatId });
  const regeneration = useRegenerateMessage({ chatId });
  const toolCallRespond = useToolCallRespond({ chatId });
  const composer = useChatComposerState({ seedNote });
  const speech = useSpeechToText({ onTranscript: composer.setDraft });
  const display = useChatDisplayMessages({ messages });
  const search = useChatMessageSearch(chatId, isSearchOpen);
  const archiveChat = useArchiveChat({
    chatId,
    onSuccess: () => navigate('/', { viewTransition: true }),
  });
  const { responseLength, setResponseLength } = useResponseLength();
  const visibleMessages =
    isSearchOpen && search.debouncedQuery ? search.results : display.displayMessages;

  async function handleSend() {
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
    if (speech.isListening) {
      speech.stop();
    }

    const messageToSend = composer.draftWithSeed;
    const filesToSend = composer.attachedFiles;
    const notesToSend = composer.selectedNotesForSend;
    const selectedNotesToRestore = composer.selectedNotes;
    let accepted = false;
    setIsRetryable(false);

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      },
      onCommitted: (message) => {
        display.setPendingAssistantMessage(message);
      },
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
  }

  if (messagesStatus === 404 || isNotFound) {
    return (
      <ErrorState
        actionLabel="Start a new chat"
        message="This conversation no longer exists or you do not have access to it."
        onAction={() => navigate('/', { viewTransition: true })}
        title="Conversation unavailable"
      />
    );
  }

  if (messagesError) {
    return (
      <ErrorState
        actionLabel="Retry loading"
        message={
          isOnline
            ? 'We could not load this conversation. Check your connection and try again.'
            : 'You are offline. Reconnect and retry loading this conversation.'
        }
        onAction={() => void retry()}
        title="Unable to load conversation"
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <RouteHeader>
        <div className="relative h-7 min-w-0 flex-1">
          <div
            aria-hidden={isSearchOpen}
            className={`absolute inset-0 flex items-center transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:transform-none ${isSearchOpen ? 'pointer-events-none translate-x-2 opacity-0' : 'translate-x-0 opacity-100'}`}
            data-chat-actions
            inert={isSearchOpen ? true : undefined}
          >
            <ChatConversationActions
              isArchiving={archiveChat.isPending}
              isSearchOpen={isSearchOpen}
              isSettingsOpen={isSettingsOpen}
              onArchive={() => archiveChat.mutate({ chatId })}
              onNewChat={() => navigate('/', { viewTransition: true })}
              onResponseSettings={() => setIsSettingsOpen(true)}
              onSearch={() => setIsSearchOpen(true)}
            />
          </div>
          <ChatMessageSearch
            error={search.error}
            isOpen={isSearchOpen}
            onChange={search.setQuery}
            onClose={() => {
              search.close();
              setIsSearchOpen(false);
            }}
            query={search.query}
          />
        </div>
      </RouteHeader>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        {isSettingsOpen ? (
          <ChatResponseSettings
            onChange={setResponseLength}
            onClose={() => setIsSettingsOpen(false)}
            value={responseLength}
          />
        ) : null}

        <Conversation>
          <ConversationContent>
            {isSearchOpen &&
            search.debouncedQuery &&
            !search.isSearching &&
            search.results.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-secondary">No messages found.</p>
            ) : null}
            {visibleMessages.map((message) => (
              <ChatMessageView
                key={message.id}
                isSpeechActive={activeSpeechMessageId === message.id}
                isGenerationActive={
                  streamMessage.isStreaming ||
                  streamMessage.status === 'stopping' ||
                  regeneration.isRegenerating
                }
                isRegenerating={regeneration.activeMessageId === message.id}
                regenerationStatus={
                  regeneration.lastMessageId === message.id ? regeneration.status : 'idle'
                }
                regenerationError={
                  regeneration.lastMessageId === message.id ? regeneration.error?.message : null
                }
                isToolResponding={toolCallRespond.isResponding}
                message={message}
                onActivateSpeech={activateSpeech}
                onApproveTool={({ messageId, toolCallId }) =>
                  void toolCallRespond.respond({ messageId, toolCallId, approved: true })
                }
                onDeactivateSpeech={deactivateSpeech}
                onDelete={deleteMessage}
                onRejectTool={({ messageId, toolCallId }) =>
                  void toolCallRespond.respond({ messageId, toolCallId, approved: false })
                }
                onRegenerate={(messageId) =>
                  void regeneration.regenerate(messageId, responseLength)
                }
                onCancelRegenerate={() => void regeneration.cancel()}
                onRetryRegenerate={() => void regeneration.retry()}
                onEdit={updateMessage}
                isDeleting={isDeleting}
                speechSrc={getSpeechUrl(chatId, message.id)}
              />
            ))}
            {display.isThinking ? (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Thinking</Shimmer>
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <ChatComposer
          attachments={composer.attachedFiles}
          contextContent={
            composer.suggestions.length > 0 || composer.selectedNotesForSend.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {composer.selectedNotesForSend.map((note) => (
                  <span
                    key={note.id}
                    className="rounded-full bg-emphasis-faint px-2.5 py-1 text-xs text-text-secondary"
                  >
                    {note.title || 'Untitled'}
                  </span>
                ))}
                {composer.suggestions.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary"
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
      </div>
    </div>
  );
}
