import { X } from 'lucide-react';
import { memo } from 'react';

import type { UploadedFile } from '../../types/upload';

export const ComposerAttachmentList = memo(function ComposerAttachmentList({
  errors,
  files,
  onRemove,
}: {
  errors: string[];
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
}) {
  if (files.length === 0 && errors.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-md border border-border bg-bg-surface px-2 py-1"
            >
              <span className="max-w-[180px] truncate text-xs text-foreground">
                {file.originalName}
              </span>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                aria-label={`Remove ${file.originalName}`}
                className="text-text-tertiary transition-colors hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {errors.map((error) => (
        <div key={error} className="text-xs text-destructive">
          {error}
        </div>
      ))}
    </div>
  );
});
