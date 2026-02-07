import type { FileStatus } from '@hominem/jobs-services';

import { XIcon } from 'lucide-react';
import { memo } from 'react';

import { ProgressBar } from '~/components/progress-bar';
import { cn } from '~/lib/utils';

export const FileUploadStatus = memo(function FileUploadStatus({
  uploadStatus,
}: {
  uploadStatus?: FileStatus;
}) {
  if (!uploadStatus) return null;
  const { status, error, stats } = uploadStatus;

  if (status === 'uploading' || status === 'processing') {
    const progress = stats?.progress;

    return (
      <output className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-muted-foreground font-medium">
            {status === 'uploading' ? 'Uploading' : 'Processing'}
          </span>
          <span className="text-sm font-medium text-foreground">
            {progress !== undefined ? `${Math.round(progress)}%` : ''}
          </span>
        </div>
        <div className="w-full">
          {typeof progress === 'number' ? (
            <ProgressBar
              progress={progress}
              className={cn(
                'h-2 bg-muted',
                'before:bg-gradient-to-r before:from-[var(--color-emphasis-high)] before:to-[var(--color-emphasis-medium)]',
              )}
              aria-label={`${Math.round(progress)}% complete`}
            />
          ) : (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[var(--color-emphasis-high)] to-[var(--color-emphasis-medium)] animate-progress-indeterminate" />
            </div>
          )}
        </div>
      </output>
    );
  }

  if (status === 'queued') {
    return (
      <output className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-muted-foreground font-medium">Queue position</span>
        </div>
        <div className="w-full">
          <ProgressBar
            progress={0}
            className="h-2 bg-warning-subtle before:bg-gradient-to-r before:from-warning before:to-warning/70"
          />
        </div>
      </output>
    );
  }

  if (status === 'done') {
    return (
      <output className="space-y-3">
        <div className="w-full">
          <ProgressBar
            progress={100}
            className="h-2 bg-emphasis-minimal before:bg-gradient-to-r before:from-[var(--color-emphasis-highest)] before:to-[var(--color-emphasis-high)]"
          />
        </div>
        {stats && <ProcessingStats stats={stats} />}
      </output>
    );
  }

  if (status === 'error') {
    return (
      <output className="mt-2" role="alert">
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
          <XIcon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm">{error}</span>
        </div>
      </output>
    );
  }

  return <output className="text-sm text-muted-foreground">{status}</output>;
});

const ProcessingStats = memo(function ProcessingStats({ stats }: { stats: FileStatus['stats'] }) {
  if (!stats || typeof stats !== 'object') return null;

  return (
    <dl className="mt-3 divide-y divide-border">
      {stats.processingTime !== undefined && (
        <div className="py-2 first:pt-0 last:pb-0">
          <dt className="sr-only">Processing time</dt>
          <dd className="text-sm text-foreground font-medium">
            Completed in {(stats.processingTime / 1000).toFixed(1)}s
          </dd>
        </div>
      )}
      {stats.total !== undefined && Object.values(stats).length ? (
        <div className="py-2">
          <div className="grid grid-cols-2 gap-4">
            <ProcessingStat label="Total" value={stats.total} />
            <ProcessingStat label="Created" value={stats.created} />
            <ProcessingStat label="Updated" value={stats.updated} />
            <ProcessingStat label="Skipped" value={stats.skipped} />
            <ProcessingStat label="Merged" value={stats.merged} />
            <ProcessingStat label="Invalid" value={stats.invalid} />
          </div>
        </div>
      ) : null}

      {stats.errors?.length && stats.errors.length > 0 ? (
        <div className="py-2">
          <dt className="text-sm font-medium text-foreground">Errors</dt>
          <dd className="mt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
              {stats.errors.length} error{stats.errors.length > 1 ? 's' : ''}
            </span>
          </dd>
        </div>
      ) : null}
    </dl>
  );
});

const ProcessingStat = memo(function ProcessingStat({
  label,
  value,
}: {
  label: string;
  value?: number | undefined;
}) {
  if (value === undefined) return null;
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value.toLocaleString()}</dd>
    </div>
  );
});
