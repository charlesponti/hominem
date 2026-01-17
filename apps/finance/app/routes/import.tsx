import type { FileStatus, ImportRequestResponse } from '@hominem/jobs-services';

import { Button } from '@hominem/ui/button';
import { Alert, AlertDescription } from '@hominem/ui/components/ui/alert';
import { Badge } from '@hominem/ui/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo } from 'react';

import { DropZone } from '~/components/drop-zone';
import { FileUploadStatus } from '~/components/file-upload-status';
import { FileUploadStatusBadge } from '~/components/file-upload-status-badge';
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
        status?: FileStatus;
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
          description: 'Please select only CSV files',
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
    <div className="p-4 sm:p-6 md:p-8">
      <div
        className={cn(
          'w-full max-w-2xl mx-auto p-8 space-y-6',
          'transition-all duration-500 ease-in-out',
        )}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Import Transactions</h1>
            {!isConnected && (
              <Badge variant="outline" className="animate-pulse">
                Connecting...
              </Badge>
            )}
          </div>
          <p className="text-gray-500">Drag and drop your CSV files or click to browse</p>
        </motion.div>

        {/* Error display */}
        {isError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive">
              <AlertDescription>
                {error?.message || 'An error occurred during import'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* File upload area */}
        <motion.div
          className="w-full flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            delay: 0.1,
          }}
        >
          <DropZone
            isImporting={isImportInProgress}
            dragActive={dragActive}
            className={cn(
              'transition-all duration-300',
              dragActive && 'scale-[1.02] border-blue-400',
            )}
            onDrop={handleDropWithValidation}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onChange={handleFileChange}
            accept=".csv"
            multiple={true}
          />
        </motion.div>

        {/* Single file list with all files */}
        {allFiles.length > 0 && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Files</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {statusCounts.selected > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 bg-gray-400 rounded-full" />
                    {statusCounts.selected} selected
                  </span>
                )}
                {statusCounts.processing > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 bg-blue-500 rounded-full" />
                    {statusCounts.processing} processing
                  </span>
                )}
                {statusCounts.queued > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 bg-amber-500 rounded-full" />
                    {statusCounts.queued} queued
                  </span>
                )}
                {statusCounts.completed > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="size-2 bg-green-500 rounded-full" />
                    {statusCounts.completed} completed
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-3">
              <AnimatePresence>
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
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}

type FileImportProps = {
  fileName: string;
  status?: FileStatus;
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
  const { toast } = useToast();

  const handleStart = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: 'Connection required',
        description: 'Please wait for the connection to be established',
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
      return <div className="size-3 bg-gray-400 rounded-full" />;
    }

    const indicators = {
      uploading: <div className="size-3 bg-blue-500 rounded-full animate-pulse" />,
      processing: <div className="size-3 bg-purple-500 rounded-full animate-pulse" />,
      queued: <div className="size-3 bg-amber-500 rounded-full" />,
      done: <div className="size-3 bg-green-500 rounded-full" />,
      error: <div className="size-3 bg-red-500 rounded-full" />,
    };

    return (
      indicators[status.status as keyof typeof indicators] || (
        <div className="size-3 bg-gray-400 rounded-full" />
      )
    );
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
        'p-4 rounded-lg backdrop-blur-sm',
        'border border-gray-200/50',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 ease-in-out',
        // Add subtle border color based on status
        !status && 'border-l-4 border-l-gray-400',
        status?.status === 'processing' && 'border-l-4 border-l-purple-500',
        status?.status === 'uploading' && 'border-l-4 border-l-blue-500',
        status?.status === 'queued' && 'border-l-4 border-l-amber-500',
        status?.status === 'done' && 'border-l-4 border-l-green-500',
        status?.status === 'error' && 'border-l-4 border-l-red-500',
      ),
    [status],
  );

  return (
    <motion.li
      className={itemClassName}
      key={id} // Use key instead of layoutId for simpler animation
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {statusIndicator}
          <span className="font-medium truncate flex-1">{fileName}</span>
          <div className="flex items-center gap-2">
            <FileUploadStatusBadge status={status?.status} />
            {buttonStates.canStart && (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={!isConnected}
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              >
                Start
              </Button>
            )}
            {buttonStates.canRemove && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        {status ? <FileUploadStatus uploadStatus={status} /> : null}
      </div>
    </motion.li>
  );
});
