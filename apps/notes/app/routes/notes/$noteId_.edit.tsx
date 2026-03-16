import { type LoaderFunctionArgs, redirect } from 'react-router';

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

export default function NoteEditPage({ loaderData }: { loaderData: { noteId: string } }) {
  const { noteId } = loaderData;
  const { data: note, isLoading } = useNote(noteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Note not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background pb-[var(--hyper-form-resting-height,72px)]">
      <div className="mx-auto flex w-full max-w-160 flex-1 min-h-0 flex-col px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-6 border-b border-border/60 pb-5">
          <div className="body-4 uppercase tracking-[0.12em] text-text-tertiary">Editor</div>
          <h1 className="heading-2 mt-2 text-foreground">{note.title || 'Untitled note'}</h1>
        </header>

        <section className="min-h-0 flex-1 rounded-4xl border border-border/60 bg-background px-5 py-5 sm:px-6">
          <NoteEditor note={note} />
        </section>
      </div>
    </div>
  );
}
