import { memo, useRef } from 'react';
import { Link } from 'react-router';

import { Button } from '../button';
import { SurfacePanel } from '../surfaces/surface-panel';

interface NoteActionsPanelProps {
  noteId: string;
  onAttachFiles: (files: FileList) => Promise<void>;
  uploadErrors?: string[];
  isUploading?: boolean;
}

export const NoteActionsPanel = memo(function NoteActionsPanel({
  noteId,
  onAttachFiles,
  uploadErrors = [],
  isUploading = false,
}: NoteActionsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <SurfacePanel>
      <h2 className="text-sm font-semibold text-foreground">Actions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? 'Uploading…' : 'Attach files'}
        </Button>
        <Link
          to={`/chat?noteId=${noteId}`}
          className="inline-flex items-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Chat with this note
        </Link>
      </div>
      <input
        ref={fileInputRef}
        hidden
        multiple
        type="file"
        data-testid="note-file-input"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) {
            void onAttachFiles(event.target.files);
          }
          event.currentTarget.value = '';
        }}
      />
      {uploadErrors.length > 0 ? (
        <p className="mt-3 text-sm text-destructive">{uploadErrors.join(', ')}</p>
      ) : null}
    </SurfacePanel>
  );
});
