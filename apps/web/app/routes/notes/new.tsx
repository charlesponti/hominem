import { Button } from '@hominem/ui/button';
import { type LoaderFunctionArgs } from 'react-router';
import { useNavigate } from 'react-router';

import { useCreateNote } from '~/hooks/use-notes';
import { requireAuth } from '~/lib/guards';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return {};
}

export default function NewNotePage() {
  const navigate = useNavigate();
  const createNote = useCreateNote();

  const handleCreateNote = async () => {
    try {
      const note = await createNote.mutateAsync({
        content: '',
        title: '',
      });
      if (note?.id) {
        navigate(`/notes/${note.id}`);
      }
    } catch {
      // Error is already handled by the mutation's error state
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
        <Button onClick={handleCreateNote} disabled={createNote.isPending}>
          {createNote.isPending ? 'Creating...' : 'Create Note'}
        </Button>
      </div>
    </div>
  );
}
