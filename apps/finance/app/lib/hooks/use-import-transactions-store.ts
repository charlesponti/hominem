import type { FileStatus, ImportRequestResponse, ImportTransactionsJob } from '@hominem/queues';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useWebSocketStore, type WebSocketMessage } from '~/store/websocket-store';

// Define constants for channel names and message types
const IMPORT_PROGRESS_CHANNEL = 'import:progress';
const IMPORT_PROGRESS_CHANNEL_SUBSCRIBED = 'subscribed';
const IMPORT_PROGRESS_CHANNEL_TYPE = 'subscribe';
const IMPORT_TRANSACTIONS_KEY = [['finance', 'import-transactions']] as const;
const PREFLIGHT_STORAGE_KEY = 'finance:copilot-import:preflight-id';

// Throttle delay for progress updates (in milliseconds)
const PROGRESS_UPDATE_THROTTLE = 100;

export type ImportPreflightPreview = {
  preflight: { preflightId: string; fileName: string; expiresAt: number };
  plan: {
    accountGroups: Array<{
      groupKey: string;
      account: string;
      accountMask: string | null;
      matchedAccountId: string | null;
      unresolved: boolean;
    }>;
    unresolvedGroups: Array<{ groupKey: string }>;
    duplicateCandidateRowIds: string[];
    transactions: Array<{
      rowId: string;
      groupKey: string;
      selected: boolean;
      amount: string;
      postedOn: string;
      description: string;
      transactionType: string;
      pending: boolean;
      excluded: boolean;
    }>;
    stats: {
      total: number;
      selected: number;
      skipped: number;
      invalid: number;
      unresolved: number;
    };
  };
  accounts: Array<{ id: string; name: string; mask: string | null }>;
};

export function useImportTransactionsStore() {
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<FileStatus[]>([]);
  const [activeJobIds, setActiveJobIds] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [preflight, setPreflight] = useState<ImportPreflightPreview | null>(null);
  // Throttling refs for progress updates
  const progressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdatesRef = useRef<ImportTransactionsJob[]>([]);

  // Cache for stable file objects when converting from jobs
  const fileCache = useRef(new Map<string, File>());

  // Get WebSocket store functions
  const { isConnected, connect, sendMessage, subscribe } = useWebSocketStore();

  const getStableFile = useCallback((fileName: string): File => {
    const cached = fileCache.current.get(fileName);
    if (cached) {
      return cached;
    }
    const newFile = new File([], fileName);
    fileCache.current.set(fileName, newFile);
    return newFile;
  }, []);

  const convertJobToFileStatusStable = useCallback(
    (jobs: ImportTransactionsJob[]): FileStatus[] =>
      jobs.map((job) => {
        const status: FileStatus = {
          file: getStableFile(job.fileName),
          jobId: job.jobId,
          status: job.status,
          stats: job.stats,
          ...(job.error && { error: job.error }),
        };

        return status;
      }),
    [getStableFile],
  );

  // Connect on initialization
  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const preflightId = window.localStorage.getItem(PREFLIGHT_STORAGE_KEY);
    if (!preflightId) return;
    void fetch(`/api/finance/import/preflight/${preflightId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Preflight expired');
        return (await response.json()) as ImportPreflightPreview;
      })
      .then(setPreflight)
      .catch(() => window.localStorage.removeItem(PREFLIGHT_STORAGE_KEY));
  }, []);

  // Throttled update function to reduce re-render frequency
  const throttledUpdateProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      // Store the latest update
      pendingUpdatesRef.current = jobData;

      // Clear existing timeout
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
      }

      // Set new timeout
      progressUpdateTimeoutRef.current = setTimeout(() => {
        const latestJobData = pendingUpdatesRef.current;
        if (!latestJobData.length) return;

        // Batch all state updates to prevent multiple re-renders
        setStatuses((prevStatuses) => {
          const updatedStatuses = prevStatuses.length
            ? prevStatuses.map((status) => {
                const matchingJob = latestJobData.find((job) => job.fileName === status.file.name);

                if (matchingJob) {
                  const updated: FileStatus = {
                    ...status,
                    status: matchingJob.status,
                    stats: matchingJob.stats,
                  };
                  if (matchingJob.error) {
                    updated.error = matchingJob.error;
                  }
                  return updated;
                }

                return status;
              })
            : convertJobToFileStatusStable(latestJobData);

          return updatedStatuses;
        });

        // Batch active job ID updates
        const completedJobs = latestJobData.filter(
          (job) => job.status === 'done' || job.status === 'error',
        );

        if (completedJobs.length > 0) {
          const completedJobIds = completedJobs.map((job) => job.jobId);
          setActiveJobIds((prev) => prev.filter((id) => !completedJobIds.includes(id)));
        }
      }, PROGRESS_UPDATE_THROTTLE);
    },
    [convertJobToFileStatusStable],
  );

  // Process real-time job updates from WebSocket
  const updateImportProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      if (!jobData.length) return;

      // Use throttled update for frequent progress updates
      const hasProgressUpdates = jobData.some(
        (job) => job.status === 'processing' || job.status === 'uploading',
      );

      if (hasProgressUpdates) {
        throttledUpdateProgress(jobData);
      } else {
        // For non-progress updates (status changes), update immediately
        setStatuses((prevStatuses) => {
          const updatedStatuses = prevStatuses.length
            ? prevStatuses.map((status) => {
                const matchingJob = jobData.find((job) => job.fileName === status.file.name);

                if (matchingJob) {
                  const updated: FileStatus = {
                    ...status,
                    status: matchingJob.status,
                    stats: matchingJob.stats,
                  };
                  if (matchingJob.error) {
                    updated.error = matchingJob.error;
                  }
                  return updated;
                }

                return status;
              })
            : convertJobToFileStatusStable(jobData);

          return updatedStatuses;
        });

        // Update active job IDs for completed jobs
        const completedJobs = jobData.filter(
          (job) => job.status === 'done' || job.status === 'error',
        );

        if (completedJobs.length > 0) {
          const completedJobIds = completedJobs.map((job) => job.jobId);
          setActiveJobIds((prev) => prev.filter((id) => !completedJobIds.includes(id)));
        }
      }
    },
    [throttledUpdateProgress, convertJobToFileStatusStable],
  );

  // Cleanup throttled updates on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Mutation for importing files
  const importMutation = useMutation({
    mutationFn: async (files: File[]): Promise<ImportPreflightPreview[]> => {
      try {
        setError(null);

        // Initialize optimistic statuses
        const results = await Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/finance/import/preflight', {
              method: 'POST',
              body: formData,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = (await res.json()) as ImportPreflightPreview;
            setPreflight(result);
            window.localStorage.setItem(PREFLIGHT_STORAGE_KEY, result.preflight.preflightId);
            return result;
          }),
        );

        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to import transactions');
        setError(error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: IMPORT_TRANSACTIONS_KEY });
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to import transactions'));
    },
  });

  const confirmPreflight = useCallback(
    async (input: {
      mappings: Array<{ groupKey: string; accountId?: string; createNew?: boolean }>;
      selectedRowIds: string[];
    }) => {
      if (!preflight) throw new Error('No preflight is ready to confirm');
      const response = await fetch(
        `/api/finance/import/preflight/${preflight.preflight.preflightId}/confirm`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as ImportRequestResponse;
      setPreflight(null);
      window.localStorage.removeItem(PREFLIGHT_STORAGE_KEY);
      setActiveJobIds((current) => [...new Set([...current, result.jobId])]);
      queryClient.invalidateQueries({ queryKey: IMPORT_TRANSACTIONS_KEY });
      return result;
    },
    [preflight, queryClient],
  );

  const cancelJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/finance/import/jobs/${jobId}/cancel`, { method: 'POST' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }, []);

  // Subscribe to WebSocket messages when connected
  useEffect(() => {
    if (!isConnected) return;

    // Send subscription message
    sendMessage({
      type: IMPORT_PROGRESS_CHANNEL_TYPE,
    });

    // Subscribe to both channels (progress updates and confirmation of subscription)
    const unsubscribeProgress = subscribe<ImportTransactionsJob[]>(
      IMPORT_PROGRESS_CHANNEL,
      (message: WebSocketMessage<ImportTransactionsJob[]>) => {
        if (message.data) {
          updateImportProgress(message.data);
        }
      },
    );

    const unsubscribeSubscribed = subscribe<ImportTransactionsJob[]>(
      IMPORT_PROGRESS_CHANNEL_SUBSCRIBED,
      (message: WebSocketMessage<ImportTransactionsJob[]>) => {
        if (message.data) {
          updateImportProgress(message.data);
        }
      },
    );

    // Cleanup subscriptions
    return () => {
      unsubscribeProgress();
      unsubscribeSubscribed();
    };
  }, [isConnected, sendMessage, subscribe, updateImportProgress]);

  // Function to remove a file status (for cleanup when user removes files)
  const removeFileStatus = useCallback((fileName: string) => {
    setStatuses((prev) => prev.filter((status) => status.file.name !== fileName));
  }, []);

  return {
    isConnected,
    statuses,
    startImport: importMutation.mutateAsync,
    startSingleFile: (file: File) => importMutation.mutateAsync([file]),
    preflight,
    confirmPreflight,
    cancelJob,
    removeFileStatus,
    activeJobIds,
    isImporting: importMutation.isPending,
    isError: importMutation.isError || !!error,
    error,
  };
}
