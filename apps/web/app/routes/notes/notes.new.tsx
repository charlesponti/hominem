import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { RouteHeader } from '~/components/route-header';
import { Button } from '~/components/ui/button';
import { useCreateNote } from '~/hooks/use-notes';
import {
  clearChatNoteDraft,
  readChatNoteDraft,
  type ChatNoteDraft,
} from '~/lib/chat/chat-note-draft';

export const meta = () => [{ title: 'New note' }];

export default function NewNoteRoute() {
  const navigate = useNavigate();
  const createNote = useCreateNote();
  const [draft, setDraft] = useState<ChatNoteDraft | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const nextDraft = readChatNoteDraft();
    if (!nextDraft) {
      navigate('/');
      return;
    }
    setDraft(nextDraft);
    setTitle(nextDraft.title);
    setContent(nextDraft.content);
  }, [navigate]);

  if (!draft) return null;

  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New note</h1>
          <p className="text-sm text-muted-foreground">
            Edit the chat transcript before saving it.
          </p>
          {draft.linkedNoteId ? (
            <p className="mt-1 text-sm text-muted-foreground">Summary linked to the source note.</p>
          ) : null}
        </div>
        {draft.truncated ? (
          <p
            className="rounded-md border border-border p-3 text-sm text-muted-foreground"
            role="status"
          >
            This transcript was shortened to fit the note draft limit.
          </p>
        ) : null}
        {createNote.error ? (
          <p className="text-sm text-destructive" role="alert">
            {createNote.error.message}
          </p>
        ) : null}
        <label className="flex flex-col gap-2 text-sm font-medium">
          Title
          <input
            className="rounded-md border border-border bg-background px-3 py-2 font-normal"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Content
          <textarea
            className="min-h-96 rounded-md border border-border bg-background p-3 font-normal"
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={() => navigate(-1)} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={createNote.isPending || !content.trim()}
            onClick={() => {
              createNote.mutate(
                { content: content.trim(), title: title.trim() || 'Chat transcript' },
                {
                  onSuccess: () => {
                    clearChatNoteDraft();
                    navigate('/settings/memories', { viewTransition: true });
                  },
                },
              );
            }}
            type="button"
          >
            {createNote.isPending ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      </main>
    </div>
  );
}
