// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UploadedFile } from '~/types/upload';

const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
const mockAlert = vi.fn();
const mockLaunchImageLibraryAsync = vi.fn();
const mockUploadAssets = vi.fn();
const mockClearErrors = vi.fn();

let mockUploadState = {
  isUploading: false,
  progress: 0,
  progressByAssetId: {},
  errors: [] as string[],
};

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return { ...actual, Alert: { alert: mockAlert } };
});

vi.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: mockLaunchImageLibraryAsync,
}));

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    api: {
      files: {
        ':fileId': {
          $delete: mockDeleteFile,
        },
      },
    },
  }),
}));

vi.mock('~/services/files/use-file-upload', () => ({
  useFileUpload: () => ({
    uploadAssets: mockUploadAssets,
    uploadState: mockUploadState,
    clearErrors: mockClearErrors,
  }),
}));

const { ComposerProvider, useComposerContext, useComposerAttachments } =
  await import('~/components/composer/ComposerContext');

function uploadedFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: 'file-1',
    originalName: 'photo.jpg',
    type: 'image',
    mimetype: 'image/jpeg',
    size: 1000,
    url: 'https://example.com/photo.jpg',
    uploadedAt: new Date(),
    vectorIds: [],
    ...overrides,
  };
}

describe('useComposerContext', () => {
  it('throws when used outside a ComposerProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useComposerContext();
      } catch (error) {
        return error;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toContain('must be used within a ComposerProvider');
  });
});

describe('ComposerProvider / useComposerAttachments', () => {
  beforeEach(() => {
    mockUploadState = { isUploading: false, progress: 0, progressByAssetId: {}, errors: [] };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the seeded initialAttachments and upload state', () => {
    const initialAttachments = [{ id: 'a1', name: 'existing.jpg', type: 'image' }];
    const { result } = renderHook(() => useComposerAttachments(), {
      wrapper: ({ children }) => (
        <ComposerProvider initialAttachments={initialAttachments}>{children}</ComposerProvider>
      ),
    });

    expect(result.current.attachments).toEqual(initialAttachments);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.errors).toEqual([]);
  });

  it('returns an empty array and does not upload when the picker is cancelled', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true });
    const { result } = renderHook(() => useComposerContext(), {
      wrapper: ({ children }) => <ComposerProvider>{children}</ComposerProvider>,
    });

    await act(async () => {
      const picked = await result.current.pickAttachment();
      expect(picked).toEqual([]);
    });
    expect(mockUploadAssets).not.toHaveBeenCalled();
  });

  it('alerts and skips upload when the selection would exceed the max file count', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: Array.from({ length: 6 }, (_, i) => ({
        assetId: `asset-${i}`,
        uri: `file://asset-${i}.jpg`,
      })),
    });
    const { result } = renderHook(() => useComposerContext(), {
      wrapper: ({ children }) => <ComposerProvider>{children}</ComposerProvider>,
    });

    await act(async () => {
      const picked = await result.current.pickAttachment();
      expect(picked).toEqual([]);
    });

    expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('up to 5 files'));
    expect(mockUploadAssets).not.toHaveBeenCalled();
  });

  it('uploads picked assets and appends them to attachments', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ assetId: 'asset-1', uri: 'file://asset-1.jpg', fileName: 'a.jpg' }],
    });
    mockUploadAssets.mockResolvedValue([
      { assetId: 'asset-1', localUri: 'file://asset-1.jpg', uploadedFile: uploadedFile() },
    ]);
    const { result } = renderHook(() => useComposerContext(), {
      wrapper: ({ children }) => <ComposerProvider>{children}</ComposerProvider>,
    });

    await act(async () => {
      const picked = await result.current.pickAttachment();
      expect(picked).toHaveLength(1);
    });

    expect(result.current.attachments).toEqual([
      expect.objectContaining({ id: 'file-1', name: 'photo.jpg' }),
    ]);
  });

  it('deletes the uploaded file remotely and removes the attachment on onRemove', async () => {
    const { result } = renderHook(() => useComposerContext(), {
      wrapper: ({ children }) => (
        <ComposerProvider
          initialAttachments={[
            { id: 'a1', name: 'photo.jpg', type: 'image', uploadedFile: uploadedFile() },
          ]}
        >
          {children}
        </ComposerProvider>
      ),
    });

    act(() => result.current.onRemove('a1'));

    expect(mockDeleteFile).toHaveBeenCalledWith({ param: { fileId: 'file-1' } });
    expect(result.current.attachments).toEqual([]);
  });

  it('deletes uncommitted uploaded files on unmount but skips files marked as submitted', () => {
    const { result, unmount } = renderHook(() => useComposerContext(), {
      wrapper: ({ children }) => (
        <ComposerProvider
          initialAttachments={[
            {
              id: 'a1',
              name: 'kept.jpg',
              type: 'image',
              uploadedFile: uploadedFile({ id: 'file-kept' }),
            },
            {
              id: 'a2',
              name: 'orphaned.jpg',
              type: 'image',
              uploadedFile: uploadedFile({ id: 'file-orphaned' }),
            },
          ]}
        >
          {children}
        </ComposerProvider>
      ),
    });

    act(() => result.current.markAttachmentsSubmitted(['file-kept']));
    unmount();

    expect(mockDeleteFile).toHaveBeenCalledTimes(1);
    expect(mockDeleteFile).toHaveBeenCalledWith({ param: { fileId: 'file-orphaned' } });
  });
});
