import type { Note } from '@hominem/rpc/types/notes.types';
import { useNavigate } from 'react-router';

import { NoteEditor } from '~/components/notes';
import { StatePanel } from '~/components/surfaces/state-panel';
import { useDeleteNote, useUpdateNote } from '~/hooks/use-notes';
import { useFileUpload } from '~/lib/hooks/use-file-upload';

import { noteIdLoader } from './note-id.loader';

export { noteIdLoader as loader };

export default function NoteEditPage({
  loaderData,
}: {
  loaderData: { noteId: string; note: Note | null };
}) {
  const { note } = loaderData;
  const navigate = useNavigate();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { uploadFiles, uploadState } = useFileUpload();

  if (!note) {
    return (
      <div className="min-h-full">
        <StatePanel title="Note not found" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <NoteEditor
        note={note}
        onSave={async ({ id, title, content, fileIds }) => {
          await updateNote.mutateAsync({ id, title, content, fileIds });
        }}
        onUploadFiles={async (files) => {
          return uploadFiles(files);
        }}
        onDelete={async () => {
          await deleteNote.mutateAsync({ id: note.id });
          navigate('/notes');
        }}
        isDeleting={deleteNote.isPending}
        isDeletingError={deleteNote.isError}
        uploadErrors={uploadState.errors}
        isUploading={uploadState.state === 'uploading'}
      />
    </div>
  );
}
