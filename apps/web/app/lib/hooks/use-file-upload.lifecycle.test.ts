// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type UploadedResponse = {
  response?: { body?: unknown };
};
type UploadResult = {
  successful?: UploadedResponse[];
  failed?: Array<{ name: string; error?: unknown }>;
};
type Handler = (...args: unknown[]) => void;
type PluginOptions = {
  headers?: () => { Accept: string };
  onAfterResponse?: (xhr: XMLHttpRequest) => void;
  getResponseData?: (xhr: XMLHttpRequest) => unknown;
};

interface UppyHarness {
  options: unknown;
  files: unknown[];
  handlers: Map<string, Handler[]>;
  result: UploadResult;
  uploadError: unknown;
  releaseUpload: () => void;
  pluginOptions: PluginOptions | null;
  clearCalls: number;
  cancelCalls: number;
  addFile: (file: unknown) => void;
  emit: (event: string, ...args: unknown[]) => void;
  upload: () => Promise<UploadResult>;
}

const state: { current: UppyHarness | null } = { current: null };

vi.mock('@uppy/core', () => ({
  default: class FakeUppy implements UppyHarness {
    options: unknown;
    files: unknown[] = [];
    handlers = new Map<string, Handler[]>();
    result: UploadResult = { successful: [], failed: [] };
    uploadError: unknown = null;
    uploadResolvers: Array<() => void> = [];
    releaseUpload: () => void = () => undefined;
    pluginOptions: PluginOptions | null = null;
    clearCalls = 0;
    cancelCalls = 0;

    constructor(options: unknown) {
      this.options = options;
      state.current = this;
    }

    use(_plugin: unknown, options: PluginOptions) {
      this.pluginOptions = options;
      return this;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }

    off(event: string, handler: Handler) {
      this.handlers.set(
        event,
        (this.handlers.get(event) ?? []).filter((candidate) => candidate !== handler),
      );
      return this;
    }

    setFileMeta() {
      return this;
    }

    addFile(file: unknown) {
      this.files.push(file);
    }

    emit(event: string, ...args: unknown[]) {
      for (const handler of this.handlers.get(event) ?? []) handler(...args);
    }

    async upload() {
      await new Promise<void>((resolve) => {
        this.uploadResolvers.push(resolve);
        this.releaseUpload = () => {
          for (const resolver of this.uploadResolvers) resolver();
          this.uploadResolvers = [];
        };
      });
      if (this.uploadError) throw this.uploadError;
      return this.result;
    }

    clear() {
      this.clearCalls += 1;
      this.files = [];
    }

    cancelAll() {
      this.cancelCalls += 1;
    }
  },
}));

vi.mock('@uppy/xhr-upload', () => ({ default: class FakeXHRUpload {} }));

import { useFileUpload } from './use-file-upload';

const validBody = {
  success: true,
  message: 'Uploaded',
  file: {
    id: '11111111-1111-4111-8111-111111111111',
    originalName: 'brief.pdf',
    type: 'document',
    mimetype: 'application/pdf',
    size: 12,
    url: '/files/brief.pdf',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    vectorIds: [],
  },
};

const richBody = {
  ...validBody,
  file: {
    ...validBody.file,
    content: 'content',
    textContent: 'text',
    metadata: { source: 'test' },
    thumbnail: '/files/thumbnail.png',
    vectorIds: undefined,
  },
};

function files(...names: string[]): File[] {
  return names.map((name) => new File(['content'], name, { type: 'application/pdf' }));
}

function xhrResponse(status: number, responseText: string, statusText = ''): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  Object.defineProperties(xhr, {
    responseText: { configurable: true, value: responseText },
    status: { configurable: true, value: status },
    statusText: { configurable: true, value: statusText },
  });
  return xhr;
}

beforeEach(() => {
  state.current = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useFileUpload lifecycle', () => {
  it('uploads successful files, tracks progress, and handles restrictions', async () => {
    const { result, unmount } = renderHook(() => useFileUpload());
    const pending = result.current.uploadFiles(files('brief.pdf'));

    await waitFor(() => expect(state.current).not.toBeNull());
    const uppy = state.current;
    if (!uppy) throw new Error('Expected Uppy instance');
    expect(uppy.pluginOptions?.headers?.()).toEqual({ Accept: 'application/json' });
    uppy.emit('file-added', { id: 'brief', name: undefined, type: '' });
    uppy.emit('file-added', { id: 'brief-typed', name: 'brief.pdf', type: 'application/pdf' });
    act(() => uppy.emit('progress', 45));
    act(() => uppy.emit('restriction-failed', { name: 'large.pdf' }, new Error('Too large')));
    act(() => uppy.emit('restriction-failed', undefined, new Error('Invalid file')));
    uppy.pluginOptions?.onAfterResponse?.(xhrResponse(200, ''));
    expect(
      uppy.pluginOptions?.getResponseData?.(xhrResponse(200, JSON.stringify(validBody))),
    ).toEqual(validBody);
    expect(() =>
      uppy.pluginOptions?.onAfterResponse?.(
        xhrResponse(
          400,
          JSON.stringify({ error: 'upload_failed', code: 'BAD_FILE', message: 'Bad file' }),
        ),
      ),
    ).toThrow('Bad file');
    expect(() => uppy.pluginOptions?.onAfterResponse?.(xhrResponse(500, '{bad}'))).toThrow(
      'Upload failed with status 500',
    );
    expect(() =>
      uppy.pluginOptions?.onAfterResponse?.(xhrResponse(500, '', 'Server error')),
    ).toThrow('Server error');
    uppy.result = { successful: [{ response: { body: richBody } }], failed: [] };
    uppy.releaseUpload();

    const uploaded = await pending;
    await waitFor(() => expect(result.current.uploadState.state).toBe('done'));
    expect(uploaded[0]?.id).toBe(validBody.file.id);
    expect(result.current.uploadState).toMatchObject({
      state: 'done',
      isUploading: false,
      progress: 100,
      errors: [],
    });
    expect(uppy.files).toHaveLength(0);
    act(() => result.current.removeFile(validBody.file.id));
    expect(result.current.uploadState.uploadedFiles).toEqual([]);
    uppy.result = { successful: [], failed: [] };
    const secondUpload = result.current.uploadFiles(files('second.pdf'));
    await waitFor(() => expect(uppy.files).toHaveLength(1));
    uppy.releaseUpload();
    await secondUpload;
    uppy.result = {};
    const emptyUpload = result.current.uploadFiles(files('empty.pdf'));
    await waitFor(() => expect(uppy.files).toHaveLength(1));
    uppy.releaseUpload();
    await emptyUpload;
    unmount();
    expect(uppy.cancelCalls).toBe(1);
  });

  it('keeps valid uploads and reports failed or malformed results', async () => {
    const { result } = renderHook(() => useFileUpload());
    const pending = result.current.uploadFiles(files('brief.pdf', 'bad.pdf'));
    await waitFor(() => expect(state.current).not.toBeNull());
    const uppy = state.current;
    if (!uppy) throw new Error('Expected Uppy instance');
    uppy.result = {
      successful: [{ response: { body: validBody } }, { response: { body: { invalid: true } } }],
      failed: [
        { name: 'bad.pdf', error: new Error('Rejected') },
        { name: 'other.pdf', error: { message: 'Unsupported' } },
      ],
    };
    uppy.releaseUpload();

    const uploaded = await pending;
    await waitFor(() => expect(result.current.uploadState.state).toBe('error'));
    expect(uploaded).toHaveLength(1);
    expect(result.current.uploadState).toMatchObject({
      state: 'error',
      errors: ['bad.pdf: Rejected', 'other.pdf: Unsupported'],
    });
  });

  it('normalizes thrown upload failures and supports remove/reset', async () => {
    const { result } = renderHook(() => useFileUpload());
    const pending = result.current.uploadFiles(files('brief.pdf'));
    await waitFor(() => expect(state.current).not.toBeNull());
    const uppy = state.current;
    if (!uppy) throw new Error('Expected Uppy instance');
    uppy.uploadError = 'offline';
    uppy.releaseUpload();

    await expect(pending).rejects.toBe('offline');
    await waitFor(() => expect(result.current.uploadState.state).toBe('error'));
    expect(result.current.uploadState).toMatchObject({
      state: 'error',
      isUploading: false,
      progress: 0,
      errors: ['Upload failed'],
    });

    uppy.uploadError = new Error('offline error');
    const errorPending = result.current.uploadFiles(files('error.pdf'));
    await waitFor(() => expect(uppy.files).toHaveLength(2));
    uppy.releaseUpload();
    await expect(errorPending).rejects.toThrow('offline error');

    act(() => result.current.removeFile('missing'));
    await act(async () => result.current.clearAll());
    expect(result.current.uploadState).toEqual({
      state: 'idle',
      isUploading: false,
      progress: 0,
      uploadedFiles: [],
      errors: [],
    });
    expect(uppy.cancelCalls).toBe(1);
  });

  it('resets an upload state before Uppy has been initialized', async () => {
    const { result, unmount } = renderHook(() => useFileUpload());

    await act(async () => result.current.clearAll());

    expect(result.current.uploadState).toEqual({
      state: 'idle',
      isUploading: false,
      progress: 0,
      uploadedFiles: [],
      errors: [],
    });

    unmount();
  });

  it('shares the in-flight Uppy initialization promise', async () => {
    const { result, unmount } = renderHook(() => useFileUpload());
    const first = result.current.uploadFiles([]);
    const second = result.current.uploadFiles([]);

    await waitFor(() => expect(state.current).not.toBeNull());
    const uppy = state.current;
    if (!uppy) throw new Error('Expected Uppy instance');
    uppy.releaseUpload();

    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    unmount();
  });
});
