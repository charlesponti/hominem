/**
 * ComposerAttachmentList
 *
 * Subscribes directly to the store's uploadedFiles and uploadErrors slices.
 * Only re-renders when file state changes — not on draft keystrokes.
 * Dispatches REMOVE_FILE directly without callback props.
 */

import { X } from 'lucide-react';
import { memo } from 'react';

import { useComposerSlice, useComposerStore } from './composer-provider';

export const ComposerAttachmentList = memo(function ComposerAttachmentList() {
  const store = useComposerStore();
  const uploadedFiles = useComposerSlice((s) => s.uploadedFiles);
  const uploadErrors = useComposerSlice((s) => s.uploadErrors);

  if (uploadedFiles.length === 0 && uploadErrors.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1"
            >
              <span className="max-w-45 truncate text-xs text-foreground">{file.originalName}</span>
              <button
                type="button"
                onClick={() => store.dispatch({ type: 'REMOVE_FILE', fileId: file.id })}
                aria-label={`Remove ${file.originalName}`}
                className="text-text-tertiary transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {uploadErrors.map((error) => (
        <div key={error} className="text-xs text-destructive">
          {error}
        </div>
      ))}
    </div>
  );
});
