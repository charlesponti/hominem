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

export default function NoteSplitView({ loaderData }: { loaderData: { noteId: string } }) {
  const { noteId } = loaderData;
  const { data: note, isLoading: isNoteLoading } = useNote(noteId);

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
    <div className="pb-8 pt-10">
      <NoteEditor note={note} />
    </div>
  );
}
