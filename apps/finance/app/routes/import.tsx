import type { FileStatus } from '@hominem/queues';
import { Alert, AlertDescription } from '@ponti-studios/ui/feedback';
import { DropZone } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Badge } from '@ponti-studios/ui/primitives';
import { useCallback, useEffect, useMemo } from 'react';

import { FileImport } from '~/components/import/file-import';
import { PreflightReview } from '~/components/import/preflight-review';
import { useFileInput } from '~/lib/hooks/use-file-input';
import { useImportTransactionsStore } from '~/lib/hooks/use-import-transactions-store';
import { useToast } from '~/lib/hooks/use-toast';

export default function TransactionImportPage() {
  const { files, removeFile, handleDrop } = useFileInput();
  const {
    isConnected,
    statuses,
    startSingleFile,
    removeFileStatus,
    activeJobIds,
    isImporting: isImportInProgress,
    isError,
    error,
    preflight,
    confirmPreflight,
    cancelJob,
  } = useImportTransactionsStore();
  const { toast } = useToast();

  // merges the raw file picks with their status updates into one ordered list
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

    // keep track of pick order so the sort below is stable
    let originalIndex = 0;

    for (const file of files) {
      fileMap.set(file.name, {
        file,
        status: undefined,
        priority: 0, // freshly selected files show up first
        originalIndex: originalIndex++,
      });
    }

    for (const status of statuses) {
      const existing = fileMap.get(status.file.name);
      const priority =
        {
          processing: 1,
          uploading: 1,
          queued: 2,
          done: 3,
          error: 4,
          cancelled: 5,
        }[status.status] || 5;

      if (existing) {
        existing.status = status;
        existing.priority = priority;
      } else {
        fileMap.set(status.file.name, {
          file: status.file,
          status,
          priority,
          originalIndex: originalIndex++,
        });
      }
    }

    // lower priority number = shows up higher; ties break by pick order
    const sortedItems = Array.from(fileMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.originalIndex - b.originalIndex;
    });

    return sortedItems.map((item) => ({
      fileName: item.file.name,
      status: item.status,
      id: item.file.name, // filename stays stable across status updates, so use it as the key
      file: item.file,
    }));
  }, [files, statuses]);

  const statusCounts = useMemo(() => {
    const counts = {
      selected: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
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
      } else if (status.status === 'cancelled') {
        counts.cancelled++;
      }
    }

    return counts;
  }, [allFiles]);

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

  // removes the file from both the picker list and its tracked status
  const handleRemoveFile = useCallback(
    (fileName: string) => {
      removeFile(fileName);
      removeFileStatus(fileName);
    },
    [removeFile, removeFileStatus],
  );

  const memoizedStartSingleFile = useCallback(
    (file: File) => startSingleFile(file),
    [startSingleFile],
  );

  const memoizedHandleRemoveFile = useCallback(
    (fileName: string) => handleRemoveFile(fileName),
    [handleRemoveFile],
  );

  useEffect(() => {
    if (isImportInProgress && activeJobIds.length === 0 && statusCounts.completed > 0) {
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

      {preflight ? <PreflightReview preflight={preflight} onConfirm={confirmPreflight} /> : null}

      <div className="flex w-full justify-center">
        <DropZone
          status={isImportInProgress ? 'busy' : 'empty'}
          onFiles={handleDropWithValidation}
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
                file={file.file}
                isConnected={isConnected}
                onStart={memoizedStartSingleFile}
                onRemove={memoizedHandleRemoveFile}
                onCancel={cancelJob}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
