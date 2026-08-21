import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import type { NoteSearchResult } from '@hominem/rpc/types/notes.types';
import { slugifyText } from '@hominem/utils/text';
import { ArrowUp, Loader2, Mic, Paperclip, Square, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { data } from 'react-router';

import { useNoteSearch } from '~/hooks/use-notes';
import { serverEnv } from '~/lib/env.server';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useSpeechToText } from '~/lib/hooks/use-speech-to-text';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';

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
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { messages } = useChatMessages({ chatId, initialData: initialMessages });
  const streamMessage = useStreamMessage({ chatId });
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
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior =
      isFirstRenderRef.current || prefersReducedMotion ? 'auto' : 'smooth';

    container.scrollTo({ top: container.scrollHeight, behavior });
    isFirstRenderRef.current = false;
  }, [displayMessages.length, isThinking]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [draft]);

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
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={`${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'} ${
              message.id === pendingAssistantMessage?.id ? 'chat-message-enter' : ''
            }`}
          >
            <p
              className={`max-w-[80%] whitespace-pre-wrap text-sm leading-6 ${
                message.role === 'user'
                  ? 'rounded-2xl bg-emphasis-faint px-4 py-2 text-foreground'
                  : 'text-foreground'
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        {isThinking ? (
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Loader2 size={14} className="animate-spin" />
            <span className="animate-pulse">Thinking</span>
          </div>
        ) : null}
      </div>

      <div className="px-4 pb-4">
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

        <div className="flex items-center gap-1 rounded-[28px] border border-border-subtle bg-surface p-1.5 pl-2 shadow-sm">
          <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary hover:bg-emphasis-faint hover:text-foreground">
            <Paperclip size={18} />
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
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Ask anything"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 outline-none placeholder:text-text-tertiary"
          />
          {hasContent ? (
            <button
              type="button"
              disabled={streamMessage.isStreaming}
              onClick={() => void handleSend()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </button>
          ) : speech.isSupported ? (
            <button
              type="button"
              onClick={() => speech.toggle(draft)}
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                speech.isListening
                  ? 'bg-destructive text-destructive-foreground'
                  : 'text-text-tertiary hover:bg-emphasis-faint hover:text-foreground'
              }`}
            >
              {speech.isListening ? <Square size={16} /> : <Mic size={18} />}
            </button>
          ) : null}
        </div>
        {uploadState.errors.length > 0 ? (
          <p className="mt-1.5 text-xs text-destructive">{uploadState.errors.join(', ')}</p>
        ) : null}
      </div>
    </div>
  );
}
