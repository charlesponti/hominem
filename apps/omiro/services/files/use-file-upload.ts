import type { UploadedFile, UploadResponse, UploadedFileDto } from '@hominem/rpc/types';
import {
  UPLOAD_MAX_FILE_COUNT,
  UPLOAD_MAX_FILE_SIZE_BYTES,
  isSupportedUploadMimeType,
} from '@hominem/storage/constants';
import { getFileExtension, getmimeTypeFromExtension } from '@hominem/utils/files';
import { useCallback, useState } from 'react';

import { API_BASE_URL } from '~/constants';
import { parseApiError } from '~/services/api/parse-api-error';
import { useAuth } from '~/services/auth/auth-provider';
interface UploadClient {
  upload(formData: FormData): Promise<unknown>;
}

function toUploadedFile(file: UploadedFileDto): UploadedFile {
  return {
    id: file.id,
    originalName: file.originalName,
    type: file.type,
    mimetype: file.mimetype,
    size: file.size,
    ...(file.content ? { content: file.content } : {}),
    ...(file.textContent ? { textContent: file.textContent } : {}),
    ...(file.metadata ? { metadata: file.metadata } : {}),
    url: file.url,
    uploadedAt: new Date(file.uploadedAt),
    vectorIds: file.vectorIds ?? [],
  };
}

interface MobileUploadAsset {
  assetId: string;
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  type: string | null;
}

interface UploadedAsset {
  assetId: string;
  localUri: string;
  uploadedFile: UploadedFile;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  progressByAssetId: Record<string, number>;
  errors: string[];
}

interface MobileUploadBatchResult {
  uploaded: UploadedAsset[];
  errors: string[];
}

function getFallbackFileName(uri: string): string {
  return uri.split('/').pop() ?? 'attachment';
}

function resolveMobileUploadMimeType(asset: MobileUploadAsset): string {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  const fileName = asset.fileName ?? getFallbackFileName(asset.uri);
  const extension = getFileExtension(fileName);

  if (extension) {
    const mimeType = getmimeTypeFromExtension(extension);
    if (mimeType !== 'application/octet-stream') {
      return mimeType;
    }
  }

  if (asset.type === 'image') return 'image/jpeg';
  if (asset.type === 'audio') return 'audio/mpeg';
  if (asset.type === 'video') return 'video/mp4';

  return 'application/octet-stream';
}

async function readLocalAssetBlob(
  fetchImpl: typeof fetch,
  asset: MobileUploadAsset,
): Promise<Blob> {
  const response = await fetchImpl(asset.uri);

  return response.blob();
}

async function performMobileUploads(
  api: UploadClient,
  assets: MobileUploadAsset[],
  options?: {
    fetchImpl?: typeof fetch;
    onProgress?: (progress: number) => void;
    onAssetProgress?: (assetId: string, progress: number) => void;
  },
): Promise<MobileUploadBatchResult> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  let completedCount = 0;

  const uploadAsset = async (asset: MobileUploadAsset): Promise<UploadedAsset | string> => {
    const originalName = asset.fileName ?? getFallbackFileName(asset.uri);

    try {
      const mimetype = resolveMobileUploadMimeType(asset);
      if (!isSupportedUploadMimeType(mimetype)) {
        throw new Error('Unsupported file type');
      }

      const fileBlob = await readLocalAssetBlob(fetchImpl, asset);
      if (fileBlob.size > UPLOAD_MAX_FILE_SIZE_BYTES) {
        throw new Error('File exceeds 10MB limit');
      }

      const formData = new FormData();
      formData.append('file', fileBlob, originalName);
      formData.append('originalName', originalName);
      formData.append('mimetype', mimetype);

      const completion = (await api.upload(formData)) as UploadResponse;

      completedCount++;
      const overallProgress = Math.round((completedCount / assets.length) * 100);
      options?.onProgress?.(overallProgress);
      options?.onAssetProgress?.(asset.assetId, 100);

      return {
        assetId: asset.assetId,
        localUri: asset.uri,
        uploadedFile: toUploadedFile(completion.file),
      };
    } catch (error) {
      completedCount++;
      const overallProgress = Math.round((completedCount / assets.length) * 100);
      options?.onProgress?.(overallProgress);
      options?.onAssetProgress?.(asset.assetId, 0);
      return `${originalName}: ${error instanceof Error ? error.message : 'Upload failed'}`;
    }
  };

  // Initialize all assets to 0% progress
  assets.forEach((asset) => {
    options?.onAssetProgress?.(asset.assetId, 0);
  });

  const results = await Promise.all(assets.map(uploadAsset));

  const uploaded: UploadedAsset[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (typeof result === 'string') {
      errors.push(result);
    } else {
      uploaded.push(result);
    }
  }

  return {
    uploaded,
    errors,
  };
}

export function useFileUpload(fetchImpl: typeof fetch = fetch) {
  const { getAuthHeaders } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    progressByAssetId: {},
    errors: [],
  });

  const uploadAssets = useCallback(
    async (assets: MobileUploadAsset[]): Promise<UploadedAsset[]> => {
      if (assets.length === 0) {
        return [];
      }

      if (assets.length > UPLOAD_MAX_FILE_COUNT) {
        const error = `You can upload up to ${UPLOAD_MAX_FILE_COUNT} files at a time`;
        setUploadState({
          isUploading: false,
          progress: 0,
          progressByAssetId: {},
          errors: [error],
        });
        return [];
      }

      setUploadState({
        isUploading: true,
        progress: 0,
        progressByAssetId: {},
        errors: [],
      });

      const result = await performMobileUploads(
        {
          upload: async (formData) => {
            const authHeaders = await getAuthHeaders();
            const response = await fetchImpl(`${API_BASE_URL}/api/files`, {
              method: 'POST',
              headers: {
                ...authHeaders,
                Accept: 'application/json',
              },
              body: formData,
            });

            if (!response.ok) {
              const error = await parseApiError(response);
              throw new Error(
                typeof error.message === 'string'
                  ? error.message
                  : `Upload failed (${response.status})`,
              );
            }

            return response.json();
          },
        },
        assets,
        {
          onProgress: (progress) => {
            setUploadState((currentState) => ({
              ...currentState,
              progress,
            }));
          },
          onAssetProgress: (assetId, progress) => {
            setUploadState((currentState) => ({
              ...currentState,
              progressByAssetId: {
                ...currentState.progressByAssetId,
                [assetId]: progress,
              },
            }));
          },
          fetchImpl,
        },
      );

      setUploadState({
        isUploading: false,
        progress: result.uploaded.length > 0 || result.errors.length > 0 ? 100 : 0,
        progressByAssetId: {},
        errors: result.errors,
      });

      return result.uploaded;
    },
    [getAuthHeaders, fetchImpl],
  );

  const clearErrors = useCallback(() => {
    setUploadState((currentState) => ({
      ...currentState,
      errors: [],
    }));
  }, []);

  return {
    uploadState,
    uploadAssets,
    clearErrors,
  };
}
