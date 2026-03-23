import { useEffect } from 'react';
import { type LoaderFunctionArgs, redirect } from 'react-router';

import { useComposerNoteTitle } from '~/components/composer/composer-provider';
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
  const { setNoteTitle } = useComposerNoteTitle();

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
    <div className="flex h-full min-h-0 flex-col bg-background pb-(--composer-resting-height,72px)">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
        <header className="mb-6 flex flex-col gap-3 border-b editorial-rule pb-5">
          <div className="editorial-kicker text-text-tertiary">Workspace</div>
          <h1 className="heading-2 editorial-display text-text-primary">{note.title || 'Untitled note'}</h1>
        </header>

        <section className="editorial-panel min-h-0 flex-1 rounded-4xl px-5 py-5 sm:px-6">
          <NoteEditor note={note} />
        </section>
      </div>
    </div>
  );
}
