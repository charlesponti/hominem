import { useEffect } from 'react';
import { type LoaderFunctionArgs, redirect } from 'react-router';

import { useComposerNoteTitle } from '@hominem/ui/composer';
import { useNote } from '~/hooks/use-notes';
import { requireAuth } from '~/lib/guards';

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);
  const { noteId } = params;

  if (!noteId) {
    return redirect('/notes');
  }

  return { noteId };
}

/**
 * This route is a lightweight redirect surface. When a user navigates to
 * /notes/:id/chat, we register note context with the Composer so it switches
 * to note-aware mode, then redirect them back to the note workspace.
 *
 * The Composer's "Ask about this note" action handles chat creation from the
 * note workspace directly — no separate chat sub-route is needed.
 */
export default function NoteChatRedirect({ loaderData }: { loaderData: { noteId: string } }) {
  const { noteId } = loaderData;
  const { data: note } = useNote(noteId);
  const { setNoteTitle } = useComposerNoteTitle();

  useEffect(() => {
    if (note) {
      setNoteTitle(note.title || 'Untitled note');
    }
    return () => {
      setNoteTitle(null);
    };
  }, [note, setNoteTitle]);

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-background pb-[var(--composer-resting-height,72px)]">
      <div className="max-w-md text-center px-6">
        <p className="heading-4 text-foreground">{note?.title ? `"${note.title}"` : 'This note'}</p>
        <p className="body-2 mt-2 text-text-secondary">
          Use the composer below to ask questions about this note or start a conversation.
        </p>
      </div>
    </div>
  );
}
