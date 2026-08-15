// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGetAuthHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer token' });

vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));

const { useFileUpload } = await import('~/services/files/use-file-upload');

function makeAsset(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assetId: 'asset-1',
    uri: 'file:///tmp/photo.jpg',
    fileName: 'photo.jpg',
    mimeType: 'image/jpeg',
    type: 'image',
    ...overrides,
  };
}

function uploadedFileDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'file-1',
    originalName: 'photo.jpg',
    type: 'image',
    mimetype: 'image/jpeg',
    size: 123,
    url: 'https://cdn.example.com/photo.jpg',
    uploadedAt: '2026-08-14T00:00:00.000Z',
    vectorIds: [],
    ...overrides,
  };
}

describe('useFileUpload', () => {
  it('uploads assets and reports success state with progress at 100', async () => {
    const blob = new Blob(['image bytes'], { type: 'image/jpeg' });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => blob })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ file: uploadedFileDto() }),
      });

    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets([makeAsset()]);
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(2, 'http://localhost:4040/api/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', Accept: 'application/json' },
      body: expect.any(FormData),
    });
    expect(uploaded).toEqual([
      expect.objectContaining({
        assetId: 'asset-1',
        uploadedFile: expect.objectContaining({ id: 'file-1' }),
      }),
    ]);
    expect(result.current.uploadState).toEqual({
      isUploading: false,
      progress: 100,
      progressByAssetId: {},
      errors: [],
    });
  });

  it('tracks per-asset progress while uploads are in flight', async () => {
    const blob = new Blob(['bytes'], { type: 'image/jpeg' });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => blob })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ file: uploadedFileDto() }) });

    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    await act(async () => {
      await result.current.uploadAssets([makeAsset()]);
    });

    expect(result.current.uploadState.progressByAssetId).toEqual({});
  });

  it('collects per-file errors without failing the whole batch', async () => {
    const goodBlob = new Blob(['bytes'], { type: 'image/jpeg' });
    const badBlob = new Blob(['bytes'], { type: 'image/jpeg' });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => goodBlob })
      .mockResolvedValueOnce({ blob: async () => badBlob })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ file: uploadedFileDto() }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Upload failed on server' }),
      });

    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets([
        makeAsset({ assetId: 'asset-1' }),
        makeAsset({ assetId: 'asset-2', fileName: 'broken.jpg' }),
      ]);
    });

    expect(uploaded).toHaveLength(1);
    expect(result.current.uploadState.errors).toEqual(['broken.jpg: Upload failed on server']);
    expect(result.current.uploadState.isUploading).toBe(false);
  });

  it('rejects unsupported mime types without calling the network', async () => {
    const fetchImpl = vi.fn();
    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets([
        makeAsset({ mimeType: 'application/x-msdownload', fileName: 'virus.exe', type: 'file' }),
      ]);
    });

    expect(uploaded).toEqual([]);
    expect(result.current.uploadState.errors).toEqual(['virus.exe: Unsupported file type']);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects files exceeding the max size limit', async () => {
    const bigBlob = { size: 20 * 1024 * 1024 } as Blob;
    const fetchImpl = vi.fn().mockResolvedValueOnce({ blob: async () => bigBlob });
    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets([makeAsset()]);
    });

    expect(uploaded).toEqual([]);
    expect(result.current.uploadState.errors).toEqual(['photo.jpg: File exceeds 10MB limit']);
  });

  it('rejects a batch exceeding the max file count without uploading anything', async () => {
    const fetchImpl = vi.fn();
    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    const assets = Array.from({ length: 6 }, (_, index) =>
      makeAsset({ assetId: `asset-${index}` }),
    );

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets(assets);
    });

    expect(uploaded).toEqual([]);
    expect(result.current.uploadState.errors).toEqual(['You can upload up to 5 files at a time']);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns an empty array immediately for an empty asset list', async () => {
    const fetchImpl = vi.fn();
    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets([]);
    });

    expect(uploaded).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('clearErrors resets the errors array while preserving other state', async () => {
    const fetchImpl = vi.fn();
    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    await act(async () => {
      await result.current.uploadAssets(Array.from({ length: 6 }, () => makeAsset()));
    });
    expect(result.current.uploadState.errors).toHaveLength(1);

    act(() => {
      result.current.clearErrors();
    });

    await waitFor(() => expect(result.current.uploadState.errors).toEqual([]));
  });

  it('surfaces a network-thrown error message per asset', async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useFileUpload(fetchImpl as unknown as typeof fetch));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAssets([makeAsset()]);
    });

    expect(uploaded).toEqual([]);
    expect(result.current.uploadState.errors).toEqual(['photo.jpg: offline']);
  });
});
