import { useEffect } from 'react';
import { type LoaderFunctionArgs, redirect } from 'react-router';

import { useComposer } from '~/components/composer/composer-provider';
import { useNote } from '~/hooks/use-notes';
import { requireAuth } from '~/lib/guards';

import { NoteEditor } from './components/note-editor';

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const { noteId } = params;

  if (!noteId) {
    return redirect('/notes');
  }

  return { noteId };
}

export default function NoteSplitView({ loaderData }: { loaderData: { noteId: string } }) {
  const { noteId } = loaderData;
  const { data: note, isLoading: isNoteLoading } = useNote(noteId);
  const { setNoteTitle } = useComposer();

  // Push note title to Composer once data loads — mode is derived from the URL
  useEffect(() => {
    setNoteTitle(note?.title ?? null);
    return () => setNoteTitle(null);
  }, [note?.title, setNoteTitle]);

  if (isNoteLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-secondary">Note not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background pb-[var(--composer-resting-height,72px)]">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        <header className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-5">
          <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Workspace</div>
          <h1 className="heading-2 text-foreground">{note.title || 'Untitled note'}</h1>
        </header>

        <section className="min-h-0 flex-1 rounded-md border border-border/60 bg-background px-5 py-5 sm:px-6">
          <NoteEditor note={note} />
        </section>
      </div>
    </div>
  );
}
