import type { FileStatus } from '@hominem/queues';
import { FileUploadStatus } from '@ponti-studios/ui/feedback';
import { Badge, Button } from '@ponti-studios/ui/primitives';
import { memo, useCallback, useMemo, type ReactNode } from 'react';

import type { ImportPreflightPreview } from '~/lib/hooks/use-import-transactions-store';
import { useToast } from '~/lib/hooks/use-toast';
import { cn } from '~/lib/utils';

type FileUploadStatusValue = 'uploading' | 'processing' | 'queued' | 'done' | 'error';

const STATUS_CONFIG: Record<FileUploadStatusValue, { bg: string; text: string; label: string }> = {
  uploading: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Uploading' },
  processing: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Processing' },
  queued: { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Queued' },
  done: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Complete' },
  error: { bg: 'bg-destructive/10', text: 'text-destructive-text', label: 'Error' },
};

type FileImportProps = {
  fileName: string;
  status?: FileStatus | undefined;
  file: File;
  isConnected: boolean;
  onStart: (file: File) => Promise<ImportPreflightPreview[]>;
  onRemove: (fileName: string) => void;
  onCancel: (jobId: string) => Promise<void>;
};

export const FileImport = memo(function FileImport({
  fileName,
  status,
  file,
  isConnected,
  onStart,
  onRemove,
  onCancel,
}: FileImportProps) {
  const { toast } = useToast();

  const handleStart = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: 'Connection required',
        description: 'Wait for connection to establish',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onStart(file);
      toast({
        title: 'Import started',
        description: `Processing ${fileName}`,
      });
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  }, [file, fileName, isConnected, onStart, toast]);

  const handleRemove = useCallback(() => {
    onRemove(fileName);
  }, [fileName, onRemove]);

  const handleCancel = useCallback(async () => {
    if (!status?.jobId) return;
    try {
      await onCancel(status.jobId);
      toast({ title: 'Import cancelled', description: fileName });
    } catch (error) {
      toast({
        title: 'Could not cancel import',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  }, [fileName, onCancel, status?.jobId, toast]);

  const statusIndicator = useMemo(() => {
    if (!status) {
      return <div className="size-3 bg-muted-foreground" />;
    }

    const indicators: Record<string, ReactNode> = {
      uploading: <div className="size-3 bg-emphasis-high" />,
      processing: <div className="size-3 bg-emphasis-medium" />,
      queued: <div className="size-3 bg-warning" />,
      done: <div className="size-3 bg-emphasis-highest" />,
      error: <div className="size-3 bg-destructive" />,
    };

    return indicators[status.status] || <div className="size-3 bg-muted-foreground" />;
  }, [status]);

  const buttonStates = useMemo(
    () => ({
      canStart: !status && isConnected,
      canRemove: !status || status.status === 'done' || status.status === 'error',
    }),
    [isConnected, status],
  );

  const itemClassName = useMemo(
    () =>
      cn(
        'border border-border p-4',
        !status && 'border-l-4 border-l-border',
        status?.status === 'processing' && 'border-l-4 border-l-border',
        status?.status === 'uploading' && 'border-l-4 border-l-border',
        status?.status === 'queued' && 'border-l-4 border-l-warning',
        status?.status === 'done' && 'border-l-4 border-l-success',
        status?.status === 'error' && 'border-l-4 border-l-destructive',
      ),
    [status],
  );

  const config =
    status && status.status !== 'cancelled'
      ? (STATUS_CONFIG[status.status] ?? {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          label: status.status,
        })
      : {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          label: status ? status.status : 'selected',
        };

  return (
    <li className={itemClassName}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {statusIndicator}
          <span className="font-medium truncate flex-1">{fileName}</span>
          <div className="flex items-center gap-2">
            <Badge className={cn(config.bg, config.text)}>
              {status?.status ? status.status : 'selected'}
            </Badge>
            {buttonStates.canStart && (
              <Button size="sm" onClick={handleStart} disabled={!isConnected}>
                Start
              </Button>
            )}
            {(status?.status === 'queued' || status?.status === 'processing') && status.jobId ? (
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            ) : null}
            {buttonStates.canRemove && (
              <Button size="sm" variant="outline" onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>
        </div>
        {status ? <FileUploadStatus uploadStatus={status} /> : null}
      </div>
    </li>
  );
});
