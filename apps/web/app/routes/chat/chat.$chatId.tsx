import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@ponti-studios/ui/overlays';
import { domAnimation, LazyMotion, m } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { data, useNavigate } from 'react-router';

import { ChatComposerPanel } from '~/components/chat/chat-composer-panel';
import { ChatConversation } from '~/components/chat/chat-conversation';
import { ChatConversationActions } from '~/components/chat/chat-conversation-actions';
import { ChatMessageSearch } from '~/components/chat/chat-message-search';
import { ChatResponseSettings } from '~/components/chat/chat-response-settings';
import { ChatTaskReview } from '~/components/chat/chat-task-review';
import { preloadPersona } from '~/components/chat/persona';
import { Shimmer } from '~/components/chat/shimmer';
import { RouteHeader } from '~/components/route-header';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  useCreateChatTasks,
  useExtractChatTasks,
  type ProposedChatTask,
} from '~/hooks/use-chat-tasks';
import { useChatsList, useUpdateChatTitle } from '~/hooks/use-chats';
import { computeChatLoadState } from '~/lib/chat/compute-chat-load-state';
import { serverEnv } from '~/lib/env.server';
import { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import { useChatMessageSearch } from '~/lib/hooks/use-chat-message-search';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useOnlineStatus } from '~/lib/hooks/use-online-status';
import { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import { useResponseLength } from '~/lib/hooks/use-response-length';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';
import { useToolCallRespond } from '~/lib/hooks/use-tool-call-respond';
import { useWalkieTalkieMode } from '~/lib/hooks/use-walkie-talkie-mode';

import type { Route } from './+types/chat.$chatId';

type ChatMessageLoaderData = ChatMessageDto[];

type NoteLoaderData = {
  id: string;
  title?: string | null;
  excerpt?: string | null;
};

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
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [isRetryable, setIsRetryable] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [proposedTasks, setProposedTasks] = useState<ProposedChatTask[] | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const [autoSpeakMessageId, setAutoSpeakMessageId] = useState<string | null>(null);
  const { walkieTalkieMode, setWalkieTalkieMode } = useWalkieTalkieMode();

  const activateSpeech = useCallback((messageId: string) => {
    setActiveSpeechMessageId(messageId);
    setAutoSpeakMessageId((id) => (id === messageId ? null : id));
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
    isFetching,
    isLoading,
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
  const display = useChatDisplayMessages({ messages });
  const search = useChatMessageSearch(chatId, isSearchOpen);
  const extractTasks = useExtractChatTasks();
  const createTasks = useCreateChatTasks();
  const updateChatTitle = useUpdateChatTitle();
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
  const visibleMessages =
    isSearchOpen && search.debouncedQuery ? search.results : display.displayMessages;
  const regenerateMessage = useCallback(
    (messageId: string) => void regeneration.regenerate(messageId, responseLength),
    [regeneration.regenerate, responseLength],
  );
  const cancelRegenerate = useCallback(() => void regeneration.cancel(), [regeneration.cancel]);
  const retryRegenerate = useCallback(() => void regeneration.retry(), [regeneration.retry]);

  const loadState = computeChatLoadState({
    messagesStatus,
    isNotFound,
    hasError: Boolean(messagesError),
    isLoading,
    isFetching,
    messageCount: messages.length,
  });

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        animate={{ opacity: 1, transform: 'translateY(0)' }}
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
        initial={{ opacity: 0, transform: 'translateY(8px)' }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
      >
        <RouteHeader>
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
                isExtractingTasks={extractTasks.isPending}
                isSearchOpen={isSearchOpen}
                isSettingsOpen={isSettingsOpen}
                onDebug={() => setIsDebugOpen((open) => !open)}
                onResponseSettings={() => setIsSettingsOpen(true)}
                onSearch={() => setIsSearchOpen(true)}
                onExtractTasks={() => {
                  if (!canExtractTasks) return;
                  setIsTaskDialogOpen(true);
                  setProposedTasks(null);
                  setTaskError(null);
                  extractTasks.mutate(
                    { transcript },
                    {
                      onSuccess: (result) => setProposedTasks(result.tasks),
                      onError: (error) => setTaskError(error.message),
                    },
                  );
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
          {loadState.kind === 'ready' ? (
            <Sheet onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
              {isSettingsOpen ? (
                <SheetContent
                  aria-label="Response settings"
                  closeClassName="!inset-auto !top-4 !right-4 !bottom-auto !left-auto"
                >
                  <SheetHeader>
                    <SheetTitle>Response settings</SheetTitle>
                  </SheetHeader>
                  <ChatResponseSettings
                    onChange={setResponseLength}
                    onChangeWalkieTalkieMode={setWalkieTalkieMode}
                    onClose={() => setIsSettingsOpen(false)}
                    value={responseLength}
                    walkieTalkieMode={walkieTalkieMode}
                  />
                </SheetContent>
              ) : null}
            </Sheet>
          ) : null}

          <ChatConversation
            key={chatId}
            activeSpeechMessageId={activeSpeechMessageId}
            autoSpeakMessageId={autoSpeakMessageId}
            chatId={chatId}
            display={display}
            isDebugOpen={isDebugOpen}
            isSearchOpen={isSearchOpen}
            regeneration={regeneration}
            search={search}
            seedNote={seedNote}
            streamMessage={streamMessage}
            toolCallRespond={toolCallRespond}
            visibleMessages={visibleMessages}
            onActivateSpeech={activateSpeech}
            onDeactivateSpeech={deactivateSpeech}
            onDelete={deleteMessage}
            onUpdateMessage={updateMessage}
            isDeleting={isDeleting}
            onRegenerate={regenerateMessage}
            onCancelRegenerate={cancelRegenerate}
            onRetryRegenerate={retryRegenerate}
            loadErrorMessage={
              isOnline
                ? 'We could not load this conversation. Check your connection and try again.'
                : 'You are offline. Reconnect and retry loading this conversation.'
            }
            loadState={loadState}
            onRetryLoad={() => void retry()}
            onStartNewChat={() => navigate('/', { viewTransition: true })}
          />

          <Dialog
            onOpenChange={(open) => {
              setIsTaskDialogOpen(open);
              if (!open && !extractTasks.isPending && !createTasks.isPending) {
                setProposedTasks(null);
                setTaskError(null);
              }
            }}
            open={isTaskDialogOpen}
          >
            <DialogContent
              aria-describedby="task-extraction-description"
              className="max-h-[min(80vh,42rem)] overflow-y-auto sm:max-w-lg"
            >
              <DialogHeader>
                <DialogTitle>
                  {proposedTasks ? 'Review proposed tasks' : 'Extracting tasks'}
                </DialogTitle>
                <DialogDescription id="task-extraction-description">
                  {proposedTasks
                    ? 'Choose the tasks you want to add to your task list.'
                    : 'Reading this conversation for actionable tasks.'}
                </DialogDescription>
              </DialogHeader>
              {extractTasks.isPending ? (
                <div
                  aria-label="Extracting tasks"
                  className="flex min-h-48 items-center justify-center"
                  role="status"
                >
                  <Shimmer duration={1}>Thinking</Shimmer>
                </div>
              ) : proposedTasks ? (
                <ChatTaskReview
                  error={taskError ?? undefined}
                  isSaving={createTasks.isPending}
                  onAccept={(tasks) => {
                    setTaskError(null);
                    createTasks.mutate(
                      { tasks },
                      {
                        onSuccess: () => {
                          setProposedTasks(null);
                          setIsTaskDialogOpen(false);
                        },
                        onError: (error) => setTaskError(error.message),
                      },
                    );
                  }}
                  onReject={(title) =>
                    setProposedTasks(
                      (tasks) => tasks?.filter((task) => task.title !== title) ?? null,
                    )
                  }
                  onRetry={() => {
                    setTaskError(null);
                    extractTasks.mutate(
                      { transcript },
                      {
                        onSuccess: (result) => setProposedTasks(result.tasks),
                        onError: (error) => setTaskError(error.message),
                      },
                    );
                  }}
                  tasks={proposedTasks}
                />
              ) : taskError ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
                  <p className="text-sm text-destructive">{taskError}</p>
                  <Button
                    onClick={() => {
                      setTaskError(null);
                      extractTasks.mutate(
                        { transcript },
                        {
                          onSuccess: (result) => setProposedTasks(result.tasks),
                          onError: (error) => setTaskError(error.message),
                        },
                      );
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>

          {loadState.kind === 'ready' ? (
            <div className="mx-auto w-full max-w-5xl">
              <ChatComposerPanel
                key={chatId}
                chatId={chatId}
                currentChatTitle={currentChat?.title}
                display={display}
                isOnline={isOnline}
                isRetryable={isRetryable}
                onRequestAutoSpeak={setAutoSpeakMessageId}
                regeneration={regeneration}
                responseLength={responseLength}
                seedNote={seedNote}
                setIsRetryable={setIsRetryable}
                streamMessage={streamMessage}
                updateChatTitle={updateChatTitle}
                walkieTalkieMode={walkieTalkieMode}
              />
            </div>
          ) : null}
        </div>
      </m.div>
    </LazyMotion>
  );
}
