import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@ponti-studios/ui/overlays';
import { useCallback, useEffect, useState } from 'react';
import { data, useNavigate } from 'react-router';

import { preloadPersona } from '~/components/ai-elements/persona';
import { Shimmer } from '~/components/ai-elements/shimmer';
import { ChatComposerPanel } from '~/components/chat/chat-composer-panel';
import { ChatConversation } from '~/components/chat/chat-conversation';
import { ChatConversationActions } from '~/components/chat/chat-conversation-actions';
import { ChatMessageSearch } from '~/components/chat/chat-message-search';
import { ChatResponseSettings } from '~/components/chat/chat-response-settings';
import { ChatTaskReview } from '~/components/chat/chat-task-review';
import { ErrorState } from '~/components/error-state';
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
import { useArchiveChat, useChatsList, useCreateChat, useUpdateChatTitle } from '~/hooks/use-chats';
import { buildChatNoteDraft, saveChatNoteDraft } from '~/lib/chat/chat-note-draft';
import { serverEnv } from '~/lib/env.server';
import { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import { useChatMessageSearch } from '~/lib/hooks/use-chat-message-search';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useOnlineStatus } from '~/lib/hooks/use-online-status';
import { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import { useResponseLength } from '~/lib/hooks/use-response-length';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';
import { useToolCallRespond } from '~/lib/hooks/use-tool-call-respond';

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
  const display = useChatDisplayMessages({ messages });
  const search = useChatMessageSearch(chatId, isSearchOpen);
  const archiveChat = useArchiveChat({
    chatId,
    onSuccess: () => navigate('/', { viewTransition: true }),
  });
  const createChat = useCreateChat();
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
              isArchiving={archiveChat.isPending}
              isCreatingChat={createChat.isPending}
              isDebugOpen={isDebugOpen}
              canTransform={messages.some((message) => message.content.trim().length > 0)}
              isLinkedNote={Boolean(seedNote)}
              canExtractTasks={canExtractTasks}
              isExtractingTasks={extractTasks.isPending}
              isSearchOpen={isSearchOpen}
              isSettingsOpen={isSettingsOpen}
              onArchive={() => archiveChat.mutate({ chatId })}
              onDebug={() => setIsDebugOpen((open) => !open)}
              onNewChat={() => {
                if (createChat.isPending) return;
                createChat.mutate(
                  { title: 'New chat' },
                  { onSuccess: (chat) => navigate(`/chat/${chat.id}`, { viewTransition: true }) },
                );
              }}
              onResponseSettings={() => setIsSettingsOpen(true)}
              onSearch={() => setIsSearchOpen(true)}
              onTransform={() => {
                const draft = buildChatNoteDraft(
                  messages,
                  seedNote
                    ? `Summary: ${seedNote.title || 'linked note'}`
                    : currentChat?.title || 'Chat transcript',
                  seedNote?.id,
                );
                if (!draft.content) return;
                saveChatNoteDraft(draft);
                navigate('/notes/new', { viewTransition: true });
              }}
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

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden">
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
          activeSpeechMessageId={activeSpeechMessageId}
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
                  setProposedTasks((tasks) => tasks?.filter((task) => task.title !== title) ?? null)
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

        <ChatComposerPanel
          chatId={chatId}
          currentChatTitle={currentChat?.title}
          display={display}
          isOnline={isOnline}
          isRetryable={isRetryable}
          regeneration={regeneration}
          responseLength={responseLength}
          seedNote={seedNote}
          setIsRetryable={setIsRetryable}
          streamMessage={streamMessage}
          updateChatTitle={updateChatTitle}
        />
      </div>
    </div>
  );
}
