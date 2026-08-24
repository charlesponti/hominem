import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import type { NoteSearchResult } from '@hominem/rpc/types/notes.types';
import { slugifyText } from '@hominem/utils/text';
import { Mic, Paperclip, Square, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { data } from 'react-router';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '~/components/ai-elements/message';
import { preloadPersona } from '~/components/ai-elements/persona';
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '~/components/ai-elements/prompt-input';
import { Shimmer } from '~/components/ai-elements/shimmer';
import {
  Tool,
  ToolApprovalActions,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolPreview,
} from '~/components/ai-elements/tool';
import { SpeechPlayer } from '~/components/chat/speech-player';
import { useNoteSearch } from '~/hooks/use-notes';
import { serverEnv } from '~/lib/env.server';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useSpeechToText } from '~/lib/hooks/use-speech-to-text';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';
import { useToolCallRespond } from '~/lib/hooks/use-tool-call-respond';

import type { Route } from './+types/chat.$chatId';

type SelectedNote = NoteSearchResult;

type ChatMessageLoaderData = ChatMessageDto[];

type NoteLoaderData = {
  id: string;
  title?: string | null;
  excerpt?: string | null;
};

function getMentionQuery(value: string) {
  const match = value.match(/#([a-z0-9-]*)$/i);
  return match?.[1] ?? '';
}

function toMessageRole(role: ChatMessageDto['role']): 'user' | 'assistant' {
  return role === 'assistant' ? 'assistant' : 'user';
}

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
    : [];

  const noteId = new URL(request.url).searchParams.get('noteId');
  let seedNote: NoteLoaderData | null = null;
  if (noteId) {
    const noteResponse = await fetch(
      new URL(`/api/notes/${noteId}`, serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
      { headers },
    );
    seedNote = noteResponse.ok ? ((await noteResponse.json()) as NoteLoaderData) : null;
  }

  return data({ seedNote, messages });
}

export default function ChatPage({
  loaderData,
  params,
}: {
  loaderData: {
    seedNote: NoteLoaderData | null;
    messages: ChatMessageLoaderData;
  };
  params: { chatId: string };
}) {
  const { seedNote, messages: initialMessages } = loaderData;
  const { chatId } = params;
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

  const { messages } = useChatMessages({ chatId, initialData: initialMessages });
  const streamMessage = useStreamMessage({ chatId });
  const toolCallRespond = useToolCallRespond({ chatId });
  const { uploadFiles, uploadState } = useFileUpload();

  const [draft, setDraft] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<SelectedNote[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ id: string; originalName: string; url: string; textContent?: string; content?: string }>
  >([]);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<ChatMessageDto | null>(null);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<ChatMessageDto | null>(
    null,
  );

  const displayMessages = useMemo(() => {
    const list = [...messages];
    if (optimisticUserMessage && !list.some((m) => m.id === optimisticUserMessage.id)) {
      list.push(optimisticUserMessage);
    }
    if (pendingAssistantMessage && !list.some((m) => m.id === pendingAssistantMessage.id)) {
      list.push(pendingAssistantMessage);
    }
    return list;
  }, [messages, optimisticUserMessage, pendingAssistantMessage]);

  const isThinking = optimisticUserMessage !== null && pendingAssistantMessage === null;

  const speech = useSpeechToText({ onTranscript: setDraft });

  const seededNote = useMemo(
    () => (seedNote ? [{ id: seedNote.id, title: seedNote.title, excerpt: seedNote.excerpt }] : []),
    [seedNote],
  );

  const selectedNotesForSend = useMemo(
    () => [
      ...seededNote,
      ...selectedNotes.filter((note) => !seededNote.some((seed) => seed.id === note.id)),
    ],
    [seededNote, selectedNotes],
  );

  const draftWithSeed = useMemo(() => {
    if (!seedNote) {
      return draft;
    }

    const slug = slugifyText(seedNote.title ?? null);
    if (!slug || draft.includes(`#${slug}`)) {
      return draft;
    }

    return `${draft} #${slug}`.trim();
  }, [draft, seedNote]);

  const mentionQuery = getMentionQuery(draftWithSeed);
  const { data: searchResults } = useNoteSearch(mentionQuery, mentionQuery.length > 0);

  const suggestions = useMemo(
    () =>
      (searchResults?.notes ?? []).filter(
        (note) => !selectedNotesForSend.some((selected) => selected.id === note.id),
      ),
    [searchResults?.notes, selectedNotesForSend],
  );

  const handleSelectSuggestion = useCallback((note: SelectedNote) => {
    setSelectedNotes((current) =>
      current.some((selected) => selected.id === note.id) ? current : [...current, note],
    );
  }, []);

  async function handleAttachFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const uploaded = await uploadFiles(fileList);
    if (uploaded.length === 0) {
      return;
    }
    setAttachedFiles((current) => [...current, ...uploaded]);
  }

  const hasContent =
    draftWithSeed.trim().length > 0 || attachedFiles.length > 0 || selectedNotesForSend.length > 0;

  async function handleSend() {
    if (!hasContent) {
      return;
    }
    if (speech.isListening) {
      speech.stop();
    }

    const messageToSend = draftWithSeed;
    const filesToSend = attachedFiles;
    const notesToSend = selectedNotesForSend;

    setOptimisticUserMessage({
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
    setPendingAssistantMessage(null);

    setDraft('');
    setAttachedFiles([]);
    setSelectedNotes([]);

    try {
      await streamMessage.stream({
        message: messageToSend,
        fileIds: filesToSend.map((file) => file.id),
        noteIds: notesToSend.map((note) => note.id),
        onAccepted: (userMessage) => {
          if (userMessage) setOptimisticUserMessage(userMessage);
        },
        onCommitted: (message) => {
          setPendingAssistantMessage(message);
        },
      });
    } finally {
      setOptimisticUserMessage(null);
      setPendingAssistantMessage(null);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent>
          {displayMessages.map((message) => (
            <Message key={message.id} from={toMessageRole(message.role)}>
              <MessageContent>
                {message.toolCalls?.map((toolCall) => {
                  const isPending = toolCall.status === 'pending';
                  return (
                    <Fragment key={toolCall.toolCallId}>
                      <Tool defaultOpen={isPending}>
                        <ToolHeader
                          state={
                            isPending
                              ? 'approval-requested'
                              : toolCall.status === 'rejected'
                                ? 'output-denied'
                                : 'output-available'
                          }
                          toolName={toolCall.toolName}
                          type="dynamic-tool"
                        />
                        <ToolContent>
                          {toolCall.preview ? (
                            <ToolPreview preview={toolCall.preview} />
                          ) : (
                            <ToolInput input={toolCall.args} />
                          )}
                          {isPending ? (
                            <ToolApprovalActions
                              disabled={toolCallRespond.isResponding}
                              onApprove={() =>
                                void toolCallRespond.respond({
                                  messageId: message.id,
                                  toolCallId: toolCall.toolCallId,
                                  approved: true,
                                })
                              }
                              onReject={() =>
                                void toolCallRespond.respond({
                                  messageId: message.id,
                                  toolCallId: toolCall.toolCallId,
                                  approved: false,
                                })
                              }
                            />
                          ) : null}
                        </ToolContent>
                      </Tool>
                    </Fragment>
                  );
                })}
                <MessageResponse>{message.content}</MessageResponse>
                {message.role === 'assistant' &&
                message.content.trim() &&
                !('isStreaming' in message && message.isStreaming === true) ? (
                  <SpeechPlayer
                    isActive={activeSpeechMessageId === message.id}
                    messageId={message.id}
                    onActivate={activateSpeech}
                    onDeactivate={deactivateSpeech}
                    src={getSpeechUrl(chatId, message.id)}
                  />
                ) : null}
              </MessageContent>
            </Message>
          ))}
          {isThinking ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="px-4 pb-safe-area">
        {suggestions.length > 0 || selectedNotesForSend.length > 0 || attachedFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedNotesForSend.map((note) => (
              <span
                key={note.id}
                className="rounded-full bg-emphasis-faint px-2.5 py-1 text-xs text-text-secondary"
              >
                {note.title || 'Untitled'}
              </span>
            ))}
            {attachedFiles.map((file) => (
              <button
                key={file.id}
                type="button"
                className="flex items-center gap-1 rounded-full bg-emphasis-faint px-2.5 py-1 text-xs text-text-secondary"
                onClick={() =>
                  setAttachedFiles((current) => current.filter((item) => item.id !== file.id))
                }
              >
                {file.originalName}
                <X size={12} />
              </button>
            ))}
            {suggestions.map((note) => (
              <button
                key={note.id}
                type="button"
                className="rounded-full border border-border-subtle px-2.5 py-1 text-xs text-text-secondary"
                onClick={() => handleSelectSuggestion(note)}
              >
                {note.title || 'Untitled'}
              </button>
            ))}
          </div>
        ) : null}

        <PromptInput onSubmit={() => handleSend()}>
          <PromptInputBody>
            <PromptInputTextarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask anything"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton asChild tooltip="Attach file">
                <label className="cursor-pointer">
                  <Paperclip size={16} />
                  <input
                    hidden
                    multiple
                    type="file"
                    data-testid="chat-file-input"
                    onChange={(event) => {
                      void handleAttachFiles(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </PromptInputButton>
              {speech.isSupported ? (
                <PromptInputButton
                  onClick={() => speech.toggle(draft)}
                  tooltip={speech.isListening ? 'Stop voice input' : 'Voice input'}
                >
                  {speech.isListening ? <Square size={14} /> : <Mic size={16} />}
                </PromptInputButton>
              ) : null}
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!hasContent}
              onStop={streamMessage.isStreaming ? streamMessage.cancel : undefined}
              status={streamMessage.isStreaming ? 'streaming' : 'ready'}
            />
          </PromptInputFooter>
        </PromptInput>
        {uploadState.errors.length > 0 ? (
          <p className="mt-1.5 text-xs text-destructive">{uploadState.errors.join(', ')}</p>
        ) : null}
      </div>
    </div>
  );
}
