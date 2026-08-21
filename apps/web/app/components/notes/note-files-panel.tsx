import { memo } from 'react';

import { SurfacePanel } from '../surfaces/surface-panel';
import type { NoteFile } from './note-file.types';

interface NoteFilesPanelProps {
  files: NoteFile[];
  onDetachFile: (fileId: string) => Promise<void> | void;
}

export const NoteFilesPanel = memo(function NoteFilesPanel({
  files,
  onDetachFile,
}: NoteFilesPanelProps) {
  return (
    <SurfacePanel>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Files</h2>
        <span className="text-xs text-text-tertiary">{files.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-text-secondary">No files attached yet.</p>
        ) : null}
        {files.map((file) => (
          <div key={file.id} className="rounded-xl border border-border-subtle p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  className="font-medium text-foreground underline"
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.originalName}
                </a>
                <p className="mt-1 text-xs text-text-tertiary">{file.mimetype}</p>
              </div>
              <button
                type="button"
                className="text-xs text-text-secondary"
                onClick={() => void onDetachFile(file.id)}
              >
                Detach
              </button>
            </div>
          </div>
        ))}
      </div>
    </SurfacePanel>
  );
});
