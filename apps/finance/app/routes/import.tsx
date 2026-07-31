import type { FileStatus, ImportRequestResponse } from '@hominem/queues';
import { Alert, AlertDescription } from '@ponti-studios/ui/feedback';
import { FileUploadStatus } from '@ponti-studios/ui/feedback';
import { FileUploadStatusBadge } from '@ponti-studios/ui/feedback';
import { DropZone } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Badge, Button } from '@ponti-studios/ui/primitives';
import { memo, useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { useFileInput } from '~/lib/hooks/use-file-input';
import { useImportTransactionsStore } from '~/lib/hooks/use-import-transactions-store';
import { useToast } from '~/lib/hooks/use-toast';
import { cn } from '~/lib/utils';

export default function TransactionImportPage() {
  const {
    files,
    dragActive,
    handleFileChange,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useFileInput();
  const {
    isConnected,
    statuses,
    startSingleFile,
    removeFileStatus,
    activeJobIds,
    isImporting: isImportInProgress,
    isError,
    error,
  } = useImportTransactionsStore();
  const { toast } = useToast();

  // Combine all files into a single list with status priority
  const allFiles = useMemo(() => {
    const fileMap = new Map<
      string,
      {
        file: File;
        status?: FileStatus | undefined;
        priority: number;
        originalIndex: number;
      }
    >();

    // Track original file order for stability
    let originalIndex = 0;

    // Add selected files first to maintain their order
    for (const file of files) {
      fileMap.set(file.name, {
        file,
        status: undefined,
        priority: 0, // Selected files have highest priority for display
        originalIndex: originalIndex++,
      });
    }

    // Add files from statuses, updating existing entries or adding new ones
    for (const status of statuses) {
      const existing = fileMap.get(status.file.name);
      const priority =
        {
          processing: 1,
          uploading: 1,
          queued: 2,
          done: 3,
          error: 4,
        }[status.status] || 5;

      if (existing) {
        // Update existing file with status
        existing.status = status;
        existing.priority = priority;
      } else {
        // Add new file from status
        fileMap.set(status.file.name, {
          file: status.file,
          status,
          priority,
          originalIndex: originalIndex++,
        });
      }
    }

    // Sort by priority (lower number = higher priority), then by original index for stability
    const sortedItems = Array.from(fileMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.originalIndex - b.originalIndex;
    });

    return sortedItems.map((item) => ({
      fileName: item.file.name,
      status: item.status,
      // Stable ID that doesn't change with status updates
      id: item.file.name, // Use just the filename as the stable key
      file: item.file,
    }));
  }, [files, statuses]);

  // Get counts for different states
  const statusCounts = useMemo(() => {
    const counts = {
      selected: 0,
      queued: 0,
      processing: 0,
      completed: 0,
    };

    for (const { status } of allFiles) {
      if (!status) {
        counts.selected++;
      } else if (status.status === 'queued') {
        counts.queued++;
      } else if (status.status === 'processing' || status.status === 'uploading') {
        counts.processing++;
      } else if (status.status === 'done' || status.status === 'error') {
        counts.completed++;
      }
    }

    return counts;
  }, [allFiles]);

  // Enhanced handleDrop with validation
  const handleDropWithValidation = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        handleDrop(files);
      } else {
        toast({
          title: 'Invalid files',
          description: 'Select CSV files only',
          variant: 'destructive',
        });
      }
    },
    [handleDrop, toast],
  );

  // Handle file removal (remove from both files and statuses)
  const handleRemoveFile = useCallback(
    (fileName: string) => {
      removeFile(fileName);
      removeFileStatus(fileName);
    },
    [removeFile, removeFileStatus],
  );

  // Memoize stable callbacks for FileImport components
  const memoizedStartSingleFile = useCallback(
    (file: File) => startSingleFile(file),
    [startSingleFile],
  );

  const memoizedHandleRemoveFile = useCallback(
    (fileName: string) => handleRemoveFile(fileName),
    [handleRemoveFile],
  );

  // Handle import completion
  useEffect(() => {
    if (isImportInProgress && activeJobIds.length === 0 && statusCounts.completed > 0) {
      // Only show completion toast if we had files that completed processing
      toast({
        title: 'Import completed',
        description: `Successfully processed ${statusCounts.completed} file(s)`,
        variant: 'default',
      });
    }
  }, [activeJobIds.length, isImportInProgress, statusCounts.completed, toast]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <SectionIntro
        title="Import transactions"
        description="Drag and drop CSV files or click to browse."
        actions={!isConnected ? <Badge variant="outline">Connecting…</Badge> : undefined}
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>{error?.message || 'An error occurred during import'}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex w-full justify-center">
        <DropZone
          isImporting={isImportInProgress}
          dragActive={dragActive}
          className={cn(dragActive && 'border-border')}
          onDrop={handleDropWithValidation}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onChange={handleFileChange}
          accept=".csv"
          multiple={true}
        />
      </div>

      {allFiles.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-4 text-foreground">Files</h2>
            <div className="body-3 flex items-center gap-4 text-muted-foreground">
              {statusCounts.selected > 0 && (
                <span className="flex items-center gap-1">
                  <div className="size-2 bg-muted-foreground" />
                  {statusCounts.selected} selected
                </span>
              )}
              {statusCounts.processing > 0 && (
                <span className="flex items-center gap-1">
                  <div className="size-2 bg-emphasis-high" />
                  {statusCounts.processing} processing
                </span>
              )}
              {statusCounts.queued > 0 && (
                <span className="flex items-center gap-1">
                  <div className="size-2 bg-warning" />
                  {statusCounts.queued} queued
                </span>
              )}
              {statusCounts.completed > 0 && (
                <span className="flex items-center gap-1">
                  <div className="size-2 bg-emphasis-highest" />
                  {statusCounts.completed} completed
                </span>
              )}
            </div>
          </div>

          <ul className="space-y-3">
            {allFiles.map((file) => (
              <FileImport
                key={file.id}
                fileName={file.fileName}
                status={file.status}
                id={file.id}
                file={file.file}
                isConnected={isConnected}
                onStart={memoizedStartSingleFile}
                onRemove={memoizedHandleRemoveFile}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type FileImportProps = {
  fileName: string;
  status?: FileStatus | undefined;
  id: string;
  file: File;
  isConnected: boolean;
  onStart: (file: File) => Promise<ImportRequestResponse[]>;
  onRemove: (fileName: string) => void;
};

// Memoized FileImport component to prevent unnecessary re-renders
const FileImport = memo(function FileImport({
  fileName,
  status,
  id,
  file,
  isConnected,
  onStart,
  onRemove,
}: FileImportProps) {
  void id;
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
  }, [isConnected, onStart, file, fileName, toast]);

  const handleRemove = useCallback(() => {
    onRemove(fileName);
  }, [onRemove, fileName]);

  // Memoize status indicator to prevent recreation
  const statusIndicator = useMemo(() => {
    if (!status) {
      return <div className="size-3 bg-muted-foreground " />;
    }

    const indicators: Record<string, ReactNode> = {
      uploading: <div className="size-3 bg-emphasis-high " />,
      processing: <div className="size-3 bg-emphasis-medium " />,
      queued: <div className="size-3 bg-warning " />,
      done: <div className="size-3 bg-emphasis-highest " />,
      error: <div className="size-3 bg-destructive " />,
    };

    return indicators[status.status] || <div className="size-3 bg-muted-foreground " />;
  }, [status]);

  // Memoize button states
  const buttonStates = useMemo(
    () => ({
      canStart: !status && isConnected,
      canRemove: !status || status.status === 'done' || status.status === 'error',
    }),
    [status, isConnected],
  );

  // Memoize className computation
  const itemClassName = useMemo(
    () =>
      cn(
        'border border-border p-4',
        // Status accent on the left edge only
        !status && 'border-l-4 border-l-border',
        status?.status === 'processing' && 'border-l-4 border-l-border',
        status?.status === 'uploading' && 'border-l-4 border-l-border',
        status?.status === 'queued' && 'border-l-4 border-l-warning',
        status?.status === 'done' && 'border-l-4 border-l-success',
        status?.status === 'error' && 'border-l-4 border-l-destructive',
      ),
    [status],
  );

  return (
    <li className={itemClassName}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {statusIndicator}
          <span className="font-medium truncate flex-1">{fileName}</span>
          <div className="flex items-center gap-2">
            <FileUploadStatusBadge status={status?.status} />
            {buttonStates.canStart && (
              <Button size="sm" onClick={handleStart} disabled={!isConnected}>
                Start
              </Button>
            )}
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
