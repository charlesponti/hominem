import { Button } from '@ponti-studios/ui/primitives';
import { FileTextIcon, Loader2Icon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import type { AccountDocumentFile } from '~/lib/account/types';

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AccountDocumentsSection({
  documents,
  onDelete,
  onConvert,
}: {
  documents: AccountDocumentFile[];
  onDelete: (fileId: string) => Promise<void>;
  onConvert: (fileId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'convert' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (fileId: string, action: 'convert' | 'delete', fn: () => Promise<void>) => {
    setError(null);
    setBusyId(fileId);
    setBusyAction(action);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="heading-3">Uploaded resumes</h2>
        <p className="body-3 text-muted-foreground">
          PDFs you&apos;ve uploaded. Convert one to update your profile, or delete files you no
          longer need.
        </p>
      </div>

      {error ? (
        <p className="body-3 text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="body-3 text-muted-foreground">
            No resumes uploaded yet. Upload a PDF from the Account page to import your profile
            from it.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {documents.map((doc) => {
            const isBusy = busyId === doc.id;
            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="subheading-4 truncate text-foreground">{doc.displayName}</p>
                    <p className="body-4 text-muted-foreground">
                      {formatBytes(doc.size)}
                      {formatDate(doc.lastModified) ? ` · ${formatDate(doc.lastModified)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    isLoading={isBusy && busyAction === 'convert'}
                    loadingLabel="Converting…"
                    onClick={() => run(doc.id, 'convert', () => onConvert(doc.id))}
                  >
                    {isBusy && busyAction === 'convert' ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-4" />
                    )}
                    Convert
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    isLoading={isBusy && busyAction === 'delete'}
                    loadingLabel="Deleting…"
                    onClick={() => {
                      if (!confirm(`Delete “${doc.displayName}”? This cannot be undone.`)) return;
                      return run(doc.id, 'delete', () => onDelete(doc.id));
                    }}
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
