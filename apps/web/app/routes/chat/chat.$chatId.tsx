import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import type { NoteSearchResult } from '@hominem/rpc/types/notes.types';
import { slugifyText } from '@hominem/utils/text';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, data } from 'react-router';

import { Button } from '~/components/button';
import { useArchiveChat } from '~/hooks/use-chats';
import { useNoteSearch } from '~/hooks/use-notes';
import { serverEnv } from '~/lib/env.server';
import { useChatMessages } from '~/lib/hooks/use-chat-messages';
import { useFileUpload } from '~/lib/hooks/use-file-upload';
import { useStreamMessage } from '~/lib/hooks/use-stream-message';

import type { Route } from './+types/chat.$chatId';

type SelectedNote = NoteSearchResult;

type ChatLoaderData = {
  id: string;
  title?: string | null;
};

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
  const chatResponse = await fetch(
    new URL(`/api/chats/${params.chatId}`, serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
    { headers },
  );
  const chat = chatResponse.ok ? ((await chatResponse.json()) as ChatLoaderData) : null;

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

  return data({ chat, seedNote, messages });
}

export default function ChatPage({
  loaderData,
  params,
}: {
  loaderData: {
    chat: ChatLoaderData | null;
    seedNote: NoteLoaderData | null;
    messages: ChatMessageLoaderData;
  };
  params: { chatId: string };
}) {
  const { chat, seedNote, messages: initialMessages } = loaderData;
  const { chatId } = params;
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { messages } = useChatMessages({ chatId, initialData: initialMessages });
  const streamMessage = useStreamMessage({ chatId });
  const archiveChat = useArchiveChat({ chatId });
  const { uploadFiles, uploadState } = useFileUpload();

  const [draft, setDraft] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<SelectedNote[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ id: string; originalName: string; url: string; textContent?: string; content?: string }>
  >([]);

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

  async function handleSend() {
    if (!draftWithSeed.trim() && attachedFiles.length === 0 && selectedNotesForSend.length === 0) {
      return;
    }

    await streamMessage.stream({
      message: draftWithSeed,
      fileIds: attachedFiles.map((file) => file.id),
      noteIds: selectedNotesForSend.map((note) => note.id),
    });

    setDraft('');
    setAttachedFiles([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border-subtle bg-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">Current chat</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">{chat?.title || 'Chat'}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Explicitly selected notes and uploaded files are the only extra context sent with each
            turn.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/chat" className="text-sm text-text-secondary underline">
              Back to chats
            </Link>
            <button
              type="button"
              className="text-sm text-text-secondary underline"
              onClick={() => archiveChat.mutate({ chatId })}
            >
              Archive chat
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground">Selected notes</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedNotesForSend.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Type <code>#</code> in the composer to search notes.
              </p>
            ) : null}
            {selectedNotesForSend.map((note) => (
              <span
                key={note.id}
                className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary"
              >
                {note.title || 'Untitled note'}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-h-[70vh] flex-col rounded-2xl border border-border-subtle bg-surface">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl p-4 ${message.role === 'user' ? 'bg-background' : 'bg-muted/30'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary">
                  {message.role}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {message.content}
              </p>
              {message.referencedNotes?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.referencedNotes.map((note) => (
                    <span
                      key={note.id}
                      className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary"
                    >
                      {note.title || note.id}
                    </span>
                  ))}
                </div>
              ) : null}
              {message.files?.length ? (
                <div className="mt-3 space-y-2">
                  {message.files.map((file, index) => (
                    <div
                      key={`${message.id}-${index}`}
                      className="rounded-xl border border-border-subtle p-3 text-xs text-text-secondary"
                    >
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground underline"
                      >
                        {file.filename || 'Attachment'}
                      </a>
                      {file.metadata && 'extractedText' in file.metadata ? (
                        <p className="mt-2 whitespace-pre-wrap">
                          {String(file.metadata.extractedText)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center">
              <p className="text-base text-foreground">No messages yet.</p>
              <p className="mt-2 text-sm text-text-secondary">
                Ask a question, mention notes with <code>#</code>, or attach a file.
              </p>
            </div>
          ) : null}
        </div>

        <div
          className="border-t border-border-subtle p-4"
          data-upload-state={uploadState.state}
          data-upload-progress={uploadState.progress}
        >
          <div className="space-y-3">
            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary"
                    onClick={() => handleSelectSuggestion(note)}
                  >
                    {note.title || 'Untitled note'}
                  </button>
                ))}
              </div>
            ) : null}

            {attachedFiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary"
                    onClick={() =>
                      setAttachedFiles((current) => current.filter((item) => item.id !== file.id))
                    }
                  >
                    {file.originalName} x
                  </button>
                ))}
              </div>
            ) : null}

            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask something, mention a note with #, or paste text from a file."
              className="min-h-[120px] w-full rounded-2xl border border-border-subtle bg-background px-4 py-3 text-sm outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary">
                  Attach files
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
                {uploadState.errors.length > 0 ? (
                  <span className="text-xs text-destructive">{uploadState.errors.join(', ')}</span>
                ) : null}
              </div>
              <Button
                type="button"
                disabled={streamMessage.isStreaming}
                onClick={() => void handleSend()}
              >
                {streamMessage.isStreaming ? 'Streaming...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
