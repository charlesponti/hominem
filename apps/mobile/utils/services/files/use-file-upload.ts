import { useApiClient } from '@hominem/rpc/react';
import type { UploadedFile } from '@hominem/ui/types/upload';
import {
  CHAT_UPLOAD_MAX_FILE_COUNT,
  CHAT_UPLOAD_MAX_FILE_SIZE_BYTES,
  inferMimeTypeFromFilename,
  isSupportedChatUploadMimeType,
} from '@hominem/utils/upload';
import { useCallback, useState } from 'react';

/** Input asset from mobile picker */
export interface MobileUploadAsset {
  assetId: string;
  fileName?: string | null;
  mimeType?: string | null;
  type?: string | null;
  uri: string;
}

/** Upload state managed by useFileUpload */
export interface MobileUploadState {
  isUploading: boolean;
  progress: number;
  errors: string[];
}

/** Result of a batch upload operation */
export interface MobileUploadBatchResult {
  uploaded: MobileUploadedAsset[];
  errors: string[];
}

export interface MobileUploadedAsset {
  assetId: string;
  localUri: string;
  uploadedFile: UploadedFile;
}

function getFallbackFileName(uri: string): string {
  return uri.split('/').pop() ?? 'attachment';
}

export function resolveMobileUploadMimeType(asset: MobileUploadAsset): string {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  const fileName = asset.fileName ?? getFallbackFileName(asset.uri);
  return inferMimeTypeFromFilename(fileName);
}

async function readLocalAssetBlob(
  fetchImpl: typeof fetch,
  asset: MobileUploadAsset,
): Promise<Blob> {
  const response = await fetchImpl(asset.uri);
  return response.blob();
}

export async function performMobileUploads(
  api: {
    getUploadUrl(input: { originalName: string; mimetype: string; size: number }): Promise<{
      fileId: string;
      key: string;
      uploadUrl: string;
      headers: Record<string, string>;
      expiresAt: string;
    }>;
    register(input: {
      key: string;
      originalName: string;
      mimetype: string;
      size: number;
    }): Promise<{
      file: {
        id: string;
        originalName: string;
        type: 'image' | 'document' | 'audio' | 'video' | 'unknown';
        mimetype: string;
        size: number;
        status: string;
        url?: string;
        uploadedAt: string;
        vectorIds?: string[];
      };
      queued: boolean;
    }>;
  },
  assets: MobileUploadAsset[],
  options?: {
    fetchImpl?: typeof fetch;
    onProgress?: (progress: number) => void;
  },
): Promise<{ uploaded: MobileUploadedAsset[]; errors: string[] }> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const uploaded: MobileUploadedAsset[] = [];
  const errors: string[] = [];

  for (const [index, asset] of assets.entries()) {
    const originalName = asset.fileName ?? getFallbackFileName(asset.uri);

    try {
      const mimetype = resolveMobileUploadMimeType(asset);
      if (!isSupportedChatUploadMimeType(mimetype)) {
        throw new Error('Unsupported file type');
      }

      const fileBlob = await readLocalAssetBlob(fetchImpl, asset);
      if (fileBlob.size > CHAT_UPLOAD_MAX_FILE_SIZE_BYTES) {
        throw new Error('File exceeds 10MB limit');
      }

      // Step 1: get presigned upload URL
      const {
        fileId: _fileId,
        key,
        uploadUrl,
        headers,
      } = await api.getUploadUrl({
        originalName,
        mimetype,
        size: fileBlob.size,
      });

      // Step 2: PUT directly to R2 (client → R2, server never sees bytes)
      const uploadResponse = await fetchImpl(uploadUrl, {
        method: 'PUT',
        headers,
        body: fileBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status})`);
      }

      // Step 3: register the upload — returns immediately with queued processing
      const { file } = await api.register({
        key,
        originalName,
        mimetype,
        size: fileBlob.size,
      });

      uploaded.push({
        assetId: asset.assetId,
        localUri: asset.uri,
        uploadedFile: {
          id: file.id,
          originalName: file.originalName,
          type: file.type,
          mimetype: file.mimetype,
          size: file.size,
          status: file.status as 'pending' | 'processing' | 'ready' | 'failed',
          content: undefined,
          textContent: undefined,
          metadata: undefined,
          thumbnail: undefined,
          url: file.url ?? '',
          uploadedAt: new Date(file.uploadedAt),
          vectorIds: file.vectorIds,
        },
      });
    } catch (error) {
      errors.push(`${originalName}: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      options?.onProgress?.(Math.round(((index + 1) / assets.length) * 100));
    }
  }

  return {
    uploaded,
    errors,
  };
}

export function useFileUpload() {
  const apiClient = useApiClient();
  const [uploadState, setUploadState] = useState<MobileUploadState>({
    isUploading: false,
    progress: 0,
    errors: [],
  });

  const uploadAssets = useCallback(
    async (assets: MobileUploadAsset[]): Promise<MobileUploadedAsset[]> => {
      if (assets.length === 0) {
        return [];
      }

      if (assets.length > CHAT_UPLOAD_MAX_FILE_COUNT) {
        const error = `You can upload up to ${CHAT_UPLOAD_MAX_FILE_COUNT} files at a time`;
        setUploadState({
          isUploading: false,
          progress: 0,
          errors: [error],
        });
        return [];
      }

      setUploadState({
        isUploading: true,
        progress: 0,
        errors: [],
      });

      const result = await performMobileUploads(
        apiClient.files as Parameters<typeof performMobileUploads>[0],
        assets,
        {
          onProgress: (progress) => {
            setUploadState((currentState: MobileUploadState) => ({
              ...currentState,
              progress,
            }));
          },
        },
      );

      setUploadState({
        isUploading: false,
        progress: result.uploaded.length > 0 || result.errors.length > 0 ? 100 : 0,
        errors: result.errors,
      });

      return result.uploaded;
    },
    [apiClient],
  );

  const clearErrors = useCallback(() => {
    setUploadState((currentState: MobileUploadState) => ({
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
