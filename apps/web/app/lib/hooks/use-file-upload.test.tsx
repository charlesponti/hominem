import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFileUpload } from './use-file-upload';

type UploadSuccessHandler = (file?: MockUploadFile) => void;

interface MockUploadFile {
  id: string;
  name?: string;
  type?: string;
  size?: number | null;
  data: File;
  meta: Record<string, string | number | boolean | null | undefined>;
  error?: string;
}

const mocks = vi.hoisted(() => {
  const prepareUpload = vi.fn();
  const completeUpload = vi.fn();

  class MockUppy {
    private listeners = new Map<
      string,
      Set<
        | UploadSuccessHandler
        | ((progress: number) => void)
        | ((file: MockUploadFile | null, error: Error) => void)
      >
    >();
    private files: MockUploadFile[] = [];
    private awsPluginOptions: {
      getUploadParameters?: (file: MockUploadFile) => Promise<unknown>;
    } | null = null;

    constructor(_options: unknown) {}

    use(
      _plugin: unknown,
      options: { getUploadParameters?: (file: MockUploadFile) => Promise<unknown> },
    ) {
      this.awsPluginOptions = options;
      return this;
    }

    on(
      event: string,
      handler:
        | UploadSuccessHandler
        | ((progress: number) => void)
        | ((file: MockUploadFile | null, error: Error) => void),
    ) {
      const handlers = this.listeners.get(event) ?? new Set();
      handlers.add(handler);
      this.listeners.set(event, handlers);
      return this;
    }

    off(
      event: string,
      handler:
        | UploadSuccessHandler
        | ((progress: number) => void)
        | ((file: MockUploadFile | null, error: Error) => void),
    ) {
      this.listeners.get(event)?.delete(handler);
      return this;
    }

    addFile(file: { name: string; type: string; data: File }) {
      const mockFile: MockUploadFile = {
        id: `file-${this.files.length + 1}`,
        name: file.name,
        type: file.type,
        size: file.data.size,
        data: file.data,
        meta: {},
      };
      this.files.push(mockFile);
      return mockFile.id;
    }

    setFileMeta(
      fileId: string,
      meta: Record<string, string | number | boolean | null | undefined>,
    ) {
      const file = this.files.find((entry) => entry.id === fileId);
      if (file) {
        file.meta = {
          ...file.meta,
          ...meta,
        };
      }
    }

    async upload() {
      this.emitProgress(100);

      for (const file of this.files) {
        await this.awsPluginOptions?.getUploadParameters?.(file);
        this.emitUploadSuccess(file);
      }

      return { failed: [] as MockUploadFile[] };
    }

    cancelAll() {}

    clear() {
      this.files = [];
    }

    destroy() {
      this.clear();
      this.listeners.clear();
    }

    private emitProgress(progress: number) {
      const handlers = this.listeners.get('progress') ?? new Set();
      for (const handler of handlers) {
        if (typeof handler === 'function') {
          (handler as (progress: number) => void)(progress);
        }
      }
    }

    private emitUploadSuccess(file: MockUploadFile) {
      const handlers = this.listeners.get('upload-success') ?? new Set();
      for (const handler of handlers) {
        if (typeof handler === 'function') {
          (handler as UploadSuccessHandler)(file);
        }
      }
    }
  }

  return {
    prepareUpload,
    completeUpload,
    MockUppy,
  };
});

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    files: {
      prepareUpload: mocks.prepareUpload,
      completeUpload: mocks.completeUpload,
    },
  }),
}));

vi.mock('@uppy/aws-s3', () => ({
  default: class AwsS3Mock {},
}));

vi.mock('@uppy/core', () => ({
  default: mocks.MockUppy,
}));

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads directly through prepared R2 targets and stores completed files', async () => {
    mocks.prepareUpload.mockResolvedValue({
      fileId: 'prepared-file-id',
      key: 'users/user-1/chats/prepared-file-id-brief.pdf',
      originalName: 'brief.pdf',
      mimetype: 'application/pdf',
      size: 5,
      uploadUrl: 'https://r2.example/upload',
      headers: { 'content-type': 'application/pdf' },
      url: 'https://cdn.example/brief.pdf',
      uploadedAt: '2026-03-23T12:00:00.000Z',
      expiresAt: '2026-03-23T12:15:00.000Z',
    });

    mocks.completeUpload.mockResolvedValue({
      success: true,
      file: {
        id: 'prepared-file-id',
        originalName: 'brief.pdf',
        type: 'document',
        mimetype: 'application/pdf',
        size: 5,
        content: 'Summary',
        url: 'https://cdn.example/brief.pdf',
        uploadedAt: '2026-03-23T12:00:00.000Z',
        vectorIds: [],
      },
      message: 'Upload completed successfully',
    });

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.uploadFiles([
        new File(['brief'], 'brief.pdf', { type: 'application/pdf' }),
      ]);
    });

    await waitFor(() => {
      expect(mocks.prepareUpload).toHaveBeenCalledWith({
        originalName: 'brief.pdf',
        mimetype: 'application/pdf',
        size: 5,
      });
      expect(mocks.completeUpload).toHaveBeenCalledWith({
        fileId: 'prepared-file-id',
        key: 'users/user-1/chats/prepared-file-id-brief.pdf',
        originalName: 'brief.pdf',
        mimetype: 'application/pdf',
        size: 5,
      });
      expect(result.current.uploadState.uploadedFiles).toHaveLength(1);
      expect(result.current.uploadState.uploadedFiles[0]?.uploadedAt).toBeInstanceOf(Date);
      expect(result.current.uploadState.errors).toEqual([]);
      expect(result.current.uploadState.isUploading).toBe(false);
      expect(result.current.uploadState.progress).toBe(100);
    });
  });
});
