import { type LoaderFunctionArgs, redirect } from 'react-router';

import { LoadingScreen } from '~/components/loading';
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
    return <LoadingScreen />;
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="text-sm text-text-secondary">Note not found</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <NoteEditor note={note} />
    </div>
  );
}
