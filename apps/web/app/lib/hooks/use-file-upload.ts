import {
  UPLOAD_ALLOWED_MIME_TYPES,
  UPLOAD_MAX_FILE_COUNT,
  UPLOAD_MAX_FILE_SIZE_BYTES,
} from '@hominem/storage/constants';
// Lazy load Uppy types only for type checking
import type { Body, Meta, UppyFile } from '@uppy/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { UploadResponseSchema } from '~/lib/schemas/files.schema';
import type { UploadedFile } from '~/lib/types/upload';

/**
 * Upload state machine states.
 * Transitions: idle → uploading → done
 * Error can transition from any non-terminal state.
 */
export type UploadStateMachine = 'idle' | 'uploading' | 'done' | 'error';

function toUploadedFile(file: ReturnType<typeof UploadResponseSchema.parse>['file']): UploadedFile {
  return {
    id: file.id,
    originalName: file.originalName,
    type: file.type,
    mimetype: file.mimetype,
    size: file.size,
    ...(file.content ? { content: file.content } : {}),
    ...(file.textContent ? { textContent: file.textContent } : {}),
    ...(file.metadata ? { metadata: file.metadata } : {}),
    ...(file.thumbnail ? { thumbnail: file.thumbnail } : {}),
    url: file.url,
    uploadedAt: new Date(file.uploadedAt),
    vectorIds: file.vectorIds ?? [],
  };
}

interface UploadState {
  /** Current state in the upload state machine */
  state: UploadStateMachine;
  /** Whether an upload is currently in progress (state is uploading) */
  isUploading: boolean;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Files that have been successfully uploaded */
  uploadedFiles: UploadedFile[];
  /** Error messages from failed uploads */
  errors: string[];
}

interface UseFileUploadReturn {
  uploadState: UploadState;
  uploadFiles: (files: FileList | File[]) => Promise<UploadedFile[]>;
  removeFile: (fileId: string) => void;
  clearAll: () => void;
}

interface ApiErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test';
}

function parseApiErrorResponse(value: unknown): ApiErrorResponse | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ApiErrorResponse>;
  if (
    typeof candidate.error === 'string' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  ) {
    return {
      error: candidate.error,
      code: candidate.code,
      message: candidate.message,
      ...(candidate.details && typeof candidate.details === 'object'
        ? { details: candidate.details }
        : {}),
    };
  }

  return null;
}

function parseUploadError(xhr: XMLHttpRequest): Error {
  try {
    const parsed = parseApiErrorResponse(JSON.parse(xhr.responseText));
    if (parsed) {
      return new Error(parsed.message);
    }
  } catch {
    // Fall back to generic network/xhr details.
  }

  return new Error(xhr.statusText || `Upload failed with status ${xhr.status}`);
}

function getUploadErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return String(value ?? 'Upload failed');
}

// Lazy load Uppy modules to avoid bundling on initial page load
async function loadUppyModules() {
  const [{ default: Uppy }, { default: XHRUpload }] = await Promise.all([
    import('@uppy/core'),
    import('@uppy/xhr-upload'),
  ]);
  return { Uppy, XHRUpload };
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    state: 'idle',
    isUploading: false,
    progress: 0,
    uploadedFiles: [],
    errors: [],
  });
  const uppyRef = useRef<InstanceType<Awaited<ReturnType<typeof loadUppyModules>>['Uppy']> | null>(
    null,
  );
  const uppyPromiseRef = useRef<ReturnType<typeof loadUppyModules> | null>(null);
  const uppyCleanupRef = useRef<(() => void) | null>(null);

  // Pre-load Uppy modules in test mode for deterministic behavior
  useEffect(() => {
    if (isTestMode() && !uppyPromiseRef.current) {
      uppyPromiseRef.current = loadUppyModules();
    }
  }, []);

  useEffect(
    () => () => {
      uppyCleanupRef.current?.();
      uppyRef.current?.cancelAll();
      uppyRef.current?.clear();
    },
    [],
  );

  const getUppy = useCallback(async () => {
    if (uppyRef.current) {
      return uppyRef.current;
    }

    if (!uppyPromiseRef.current) {
      uppyPromiseRef.current = loadUppyModules();
    }

    const { Uppy, XHRUpload } = await uppyPromiseRef.current;

    const uppy = new Uppy<Meta, Body>({
      autoProceed: false,
      allowMultipleUploadBatches: true,
      restrictions: {
        allowedFileTypes: [...UPLOAD_ALLOWED_MIME_TYPES],
        maxFileSize: UPLOAD_MAX_FILE_SIZE_BYTES,
        maxNumberOfFiles: UPLOAD_MAX_FILE_COUNT,
      },
    });

    uppy.use(XHRUpload, {
      endpoint: `${import.meta.env.VITE_PUBLIC_API_URL}/api/files`,
      method: 'POST',
      formData: true,
      fieldName: 'file',
      withCredentials: true,
      headers: () => ({
        Accept: 'application/json',
      }),
      allowedMetaFields: ['originalName', 'mimetype'],
      onAfterResponse(xhr: XMLHttpRequest) {
        if (xhr.status >= 400) {
          throw parseUploadError(xhr);
        }
      },
      getResponseData(xhr: XMLHttpRequest) {
        return UploadResponseSchema.parse(JSON.parse(xhr.responseText));
      },
    });

    const handleFileAdded = (file: UppyFile<Meta, Body>) => {
      uppy.setFileMeta(file.id, {
        originalName: file.name ?? 'file',
        mimetype: file.type || 'application/octet-stream',
      });
    };

    const handleProgress = (progress: number) => {
      setUploadState((prev) => ({
        ...prev,
        progress,
      }));
    };

    const handleRestrictionFailed = (file: UppyFile<Meta, Body> | undefined, error: Error) => {
      const message = file ? `${file.name}: ${error.message}` : error.message;
      setUploadState((prev) => ({
        ...prev,
        errors: [...prev.errors, message],
      }));
    };

    uppy.on('file-added', handleFileAdded);
    uppy.on('progress', handleProgress);
    uppy.on('restriction-failed', handleRestrictionFailed);
    uppyCleanupRef.current = () => {
      uppy.off('file-added', handleFileAdded);
      uppy.off('progress', handleProgress);
      uppy.off('restriction-failed', handleRestrictionFailed);
    };

    uppyRef.current = uppy;
    return uppy;
  }, []);

  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<UploadedFile[]> => {
      const fileArray = Array.from(files);

      setUploadState((prev) => ({
        ...prev,
        state: 'uploading',
        isUploading: true,
        progress: 0,
        errors: [],
      }));

      try {
        const uppy = await getUppy();

        for (const file of fileArray) {
          uppy.addFile({
            name: file.name,
            type: file.type,
            data: file,
          });
        }

        const result = await uppy.upload();
        const newFiles = (result?.successful ?? []).flatMap((file) => {
          const body = file.response?.body;
          try {
            return [toUploadedFile(UploadResponseSchema.parse(body).file)];
          } catch {
            return [];
          }
        });

        const uploadErrors = (result?.failed ?? []).map((failedFile) => {
          const errorMessage = getUploadErrorMessage(failedFile.error);
          return `${failedFile.name}: ${errorMessage}`;
        });

        setUploadState((prev) => ({
          ...prev,
          state: uploadErrors.length > 0 ? 'error' : 'done',
          isUploading: false,
          progress: 100,
          uploadedFiles: [...prev.uploadedFiles, ...newFiles],
          errors: uploadErrors,
        }));

        uppy.clear();

        return newFiles;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setUploadState((prev) => ({
          ...prev,
          state: 'error',
          isUploading: false,
          progress: 0,
          errors: [errorMessage],
        }));

        throw error;
      }
    },
    [getUppy],
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadState((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((file) => file.id !== fileId),
    }));
  }, []);

  const clearAll = useCallback(async () => {
    if (uppyRef.current) {
      uppyRef.current.cancelAll();
      uppyRef.current.clear();
    }

    setUploadState({
      state: 'idle',
      isUploading: false,
      progress: 0,
      uploadedFiles: [],
      errors: [],
    });
  }, []);

  return {
    uploadState,
    uploadFiles,
    removeFile,
    clearAll,
  };
}
