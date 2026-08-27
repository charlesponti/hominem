import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@ponti-studios/ui/overlays';
import { useCallback, useEffect, useState } from 'react';
import { data, useLocation, useNavigate } from 'react-router';

import { preloadPersona } from '~/components/ai-elements/persona';
import { ChatApprovalDialog } from '~/components/chat/chat-approval-dialog';
import { ChatComposerPanel } from '~/components/chat/chat-composer-panel';
import { ChatConversation } from '~/components/chat/chat-conversation';
import { ChatConversationActions } from '~/components/chat/chat-conversation-actions';
import { ChatMessageSearch } from '~/components/chat/chat-message-search';
import { ChatResponseSettings } from '~/components/chat/chat-response-settings';
import { ChatTaskExtractionDialog } from '~/components/chat/chat-task-extraction-dialog';
import { ErrorState } from '~/components/error-state';
import { RouteHeader } from '~/components/route-header';
import { useChatsList } from '~/hooks/use-chats';
import { serverEnv } from '~/lib/env.server';
import { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import { useChatMessageSearch } from '~/lib/hooks/use-chat-message-search';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useChatRuntime } from '~/lib/hooks/use-chat-runtime';
import { useChatTaskExtraction } from '~/lib/hooks/use-chat-task-extraction';
import { useInitialAgentSend } from '~/lib/hooks/use-initial-agent-send';
import { useOnlineStatus } from '~/lib/hooks/use-online-status';
import { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import { useResponseLength } from '~/lib/hooks/use-response-length';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';

import type { Route } from './+types/chat.$chatId';

type ChatMessageLoaderData = ChatMessageDto[];

type NoteLoaderData = {
  id: string;
  title?: string | null;
  excerpt?: string | null;
};

// eslint-disable-next-line react-doctor/only-export-components -- React Router route modules require loader exports alongside the route component.
export async function loader({ request, params }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;

  const messagesResponse = await fetch(
    new URL(
      `/api/chats/${params.chatId}/messages?limit=50`,
      serverEnv.HOMINEM_INTERNAL_API_URL,
    ).toString(),
    { headers, signal: request.signal },
  );
  const messages = messagesResponse.ok
    ? ((await messagesResponse.json()) as ChatMessageLoaderData)
    : undefined;

  const noteId = new URL(request.url).searchParams.get('noteId');
  let seedNote: NoteLoaderData | null = null;
  if (noteId) {
    const noteResponse = await fetch(
      new URL(`/api/notes/${noteId}`, serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
      { headers, signal: request.signal },
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
  const location = useLocation();
  const runtime = useChatRuntime({ chatId });
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
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
  const streamMessage = useStreamMessage({ chatId, runtime });
  const regeneration = useRegenerateMessage({ chatId, runtime });
  const display = useChatDisplayMessages({ messages });
  const search = useChatMessageSearch(chatId, isSearchOpen);
  const { data: chats = [] } = useChatsList();
  const { responseLength, setResponseLength } = useResponseLength();
  const currentChat = chats.find((chat) => chat.id === chatId);
  const transcript = messages
    .reduce<string[]>((lines, message) => {
      const content = message.content.trim();
      if (content) lines.push(`${message.role}: ${content}`);
      return lines;
    }, [])
    .join('\n\n');
  const canExtractTasks =
    transcript.length > 0 && !streamMessage.isStreaming && !regeneration.isRegenerating;
  const taskExtraction = useChatTaskExtraction(transcript);
  const visibleMessages =
    isSearchOpen && search.debouncedQuery ? search.results : display.displayMessages;
  const regenerateMessage = useCallback(
    (messageId: string) => void regeneration.regenerate(messageId, responseLength),
    [regeneration.regenerate, responseLength],
  );
  const cancelRegenerate = useCallback(() => void regeneration.cancel(), [regeneration.cancel]);
  const retryRegenerate = useCallback(() => void regeneration.retry(), [regeneration.retry]);

  useInitialAgentSend(location, streamMessage);

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ChatApprovalDialog runtime={runtime} />
      <RouteHeader showNewChat={false}>
        <div className="relative flex min-w-0 flex-1 items-center">
          <div
            aria-hidden={isSearchOpen}
            className={`absolute inset-0 flex min-w-0 items-center justify-between gap-2 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:transform-none ${isSearchOpen ? 'pointer-events-none translate-x-2 opacity-0' : 'translate-x-0 opacity-100'}`}
            data-chat-actions
            inert={isSearchOpen ? true : undefined}
          >
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {currentChat?.title || 'New chat'}
            </span>
            <ChatConversationActions
              chatId={chatId}
              isDebugOpen={isDebugOpen}
              canExtractTasks={canExtractTasks}
              isExtractingTasks={taskExtraction.isExtracting}
              isSearchOpen={isSearchOpen}
              isSettingsOpen={isSettingsOpen}
              onDebug={() => setIsDebugOpen((open) => !open)}
              onResponseSettings={() => setIsSettingsOpen(true)}
              onSearch={() => setIsSearchOpen(true)}
              onExtractTasks={() => {
                if (!canExtractTasks) return;
                taskExtraction.open();
              }}
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

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <Sheet onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
          {isSettingsOpen ? (
            <SheetContent aria-label="Chat settings">
              <SheetHeader>
                <SheetTitle>Chat settings</SheetTitle>
                <SheetDescription>
                  Choose how the next response should be generated.
                </SheetDescription>
              </SheetHeader>
              <ChatResponseSettings
                onChange={setResponseLength}
                onClose={() => setIsSettingsOpen(false)}
                value={responseLength}
              />
            </SheetContent>
          ) : null}
        </Sheet>

        <ChatConversation
          chatId={chatId}
          display={display}
          isDebugOpen={isDebugOpen}
          isSearchOpen={isSearchOpen}
          regeneration={regeneration}
          search={search}
          seedNote={seedNote}
          streamMessage={streamMessage}
          visibleMessages={visibleMessages}
          onDelete={deleteMessage}
          onUpdateMessage={updateMessage}
          isDeleting={isDeleting}
          onRegenerate={regenerateMessage}
          onCancelRegenerate={cancelRegenerate}
          onRetryRegenerate={retryRegenerate}
        />

        <ChatTaskExtractionDialog extraction={taskExtraction} />

        <div className="mx-auto w-full max-w-5xl">
          <ChatComposerPanel
            chatId={chatId}
            currentChatTitle={currentChat?.title}
            display={display}
            isOnline={isOnline}
            regeneration={regeneration}
            responseLength={responseLength}
            seedNote={seedNote}
            streamMessage={streamMessage}
          />
        </div>
      </div>
    </div>
  );
}
