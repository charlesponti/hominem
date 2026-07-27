import { useApiClient } from '@hominem/rpc/react';
import { UPLOAD_MAX_FILE_COUNT } from '@hominem/storage/constants';
import {
  getFileExtension,
  classifyFileByMimeType,
  getmimeTypeFromExtension,
} from '@hominem/utils/files';
import * as ImagePicker from 'expo-image-picker';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from 'react';
import { Alert } from 'react-native';

import { useFileUpload } from '~/services/files/use-file-upload';
import type { UploadedFile } from '~/types/upload';

export interface ComposerAttachment {
  id: string;
  name: string;
  type: string;
  localUri?: string;
  uploadedFile?: UploadedFile;
}

interface ComposerContextValue {
  // Attachment state
  attachments: ComposerAttachment[];
  errors: string[];
  isUploading: boolean;
  progressByAssetId: Record<string, number>;
  // Attachment operations
  onRemove: (id: string) => void;
  clearAttachments: () => void;
  pickAttachment: () => Promise<ComposerAttachment[]>;
  handleCameraCapture: (photo: { uri: string; fileName?: string }) => Promise<ComposerAttachment[]>;
  markAttachmentsSubmitted: (fileIds: string[]) => void;
}

const ComposerContext = createContext<ComposerContextValue | undefined>(undefined);

interface ComposerProviderProps {
  children: React.ReactNode;
  initialAttachments?: ComposerAttachment[];
}

// The server's `type` classification is preferred; falling back to a client-side
// mimetype guess only covers files the server couldn't categorize.
function getAttachmentType(uploadedFile: UploadedFile): string {
  return uploadedFile.type !== 'unknown'
    ? uploadedFile.type
    : classifyFileByMimeType(uploadedFile.mimetype);
}

export function ComposerProvider({ children, initialAttachments = [] }: ComposerProviderProps) {
  const client = useApiClient();
  const [attachments, setAttachmentsState] = useState<ComposerAttachment[]>(
    () => initialAttachments,
  );
  const attachmentsRef = useRef(initialAttachments);
  // File ids handed off to a submission (note/chat/message) that must survive
  // this provider unmounting mid-flight — see the unmount cleanup effect below.
  const committedFileIdsRef = useRef<Set<string>>(new Set());

  const { uploadAssets, uploadState, clearErrors } = useFileUpload();

  const setAttachments = useCallback((next: SetStateAction<ComposerAttachment[]>) => {
    setAttachmentsState((currentAttachments) => {
      const resolvedAttachments =
        typeof next === 'function'
          ? (next as (currentAttachments: ComposerAttachment[]) => ComposerAttachment[])(
              currentAttachments,
            )
          : next;
      attachmentsRef.current = resolvedAttachments;
      return resolvedAttachments;
    });
  }, []);

  const deleteUploadedFile = useCallback(
    (fileId: string) => {
      void client.api.files[':fileId'].$delete({ param: { fileId } }).catch(() => undefined);
    },
    [client],
  );

  // Attachment operations
  const onRemove = useCallback(
    (id: string) => {
      setAttachments((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target?.uploadedFile?.id) {
          deleteUploadedFile(target.uploadedFile.id);
        }
        return prev.filter((a) => a.id !== id);
      });
    },
    [deleteUploadedFile, setAttachments],
  );

  const clearAttachments = useCallback(() => setAttachments([]), [setAttachments]);

  const markAttachmentsSubmitted = useCallback((fileIds: string[]) => {
    for (const fileId of fileIds) {
      committedFileIdsRef.current.add(fileId);
    }
  }, []);

  const appendUploadedAssets = useCallback(
    async (
      assets: {
        assetId: string;
        fileName: string | null;
        mimeType: string | null;
        type: string | null;
        uri: string;
      }[],
    ): Promise<ComposerAttachment[]> => {
      const uploaded = await uploadAssets(assets);
      if (uploaded.length === 0) return [];
      const next = uploaded.map((asset) => ({
        id: asset.uploadedFile.id,
        name: asset.uploadedFile.originalName,
        type: getAttachmentType(asset.uploadedFile),
        localUri: asset.localUri,
        uploadedFile: asset.uploadedFile,
      }));
      setAttachments((prev) => [...prev, ...next]);
      return next;
    },
    [setAttachments, uploadAssets],
  );

  const pickAttachment = useCallback(async (): Promise<ComposerAttachment[]> => {
    clearErrors();
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled) return [];
    if (attachments.length + result.assets.length > UPLOAD_MAX_FILE_COUNT) {
      Alert.alert(`You can upload up to ${UPLOAD_MAX_FILE_COUNT} files`);
      return [];
    }
    return appendUploadedAssets(
      result.assets.map((asset) => ({
        assetId: asset.assetId ?? asset.uri,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        type: asset.type ?? null,
        uri: asset.uri,
      })),
    );
  }, [attachments.length, appendUploadedAssets, clearErrors]);

  const handleCameraCapture = useCallback(
    async (photo: { uri: string; fileName?: string }): Promise<ComposerAttachment[]> => {
      clearErrors();
      const fileName = photo.fileName ?? photo.uri.split('/').pop() ?? 'photo';
      const extension = getFileExtension(fileName) ?? 'jpg';
      const resolvedMimeType = getmimeTypeFromExtension(extension);
      const mimeType =
        resolvedMimeType === 'application/octet-stream' ? 'image/jpeg' : resolvedMimeType;
      return appendUploadedAssets([
        {
          assetId: photo.uri,
          fileName: photo.fileName ?? null,
          mimeType,
          type: 'image',
          uri: photo.uri,
        },
      ]);
    },
    [clearErrors, appendUploadedAssets],
  );

  const value = useMemo<ComposerContextValue>(
    () => ({
      attachments,
      errors: uploadState.errors,
      isUploading: uploadState.isUploading,
      progressByAssetId: uploadState.progressByAssetId,
      onRemove,
      clearAttachments,
      pickAttachment,
      handleCameraCapture,
      markAttachmentsSubmitted,
    }),
    [
      attachments,
      uploadState.errors,
      uploadState.isUploading,
      uploadState.progressByAssetId,
      onRemove,
      clearAttachments,
      pickAttachment,
      handleCameraCapture,
      markAttachmentsSubmitted,
    ],
  );

  // Deletes any uploaded file left attached when this provider unmounts —
  // e.g. the user backed out of the composer without submitting. Files that
  // markAttachmentsSubmitted() already claimed for an in-flight submission are
  // skipped so a race between unmount and that submission can't delete files
  // the note/chat/message is about to reference.
  useEffect(
    () => () => {
      attachmentsRef.current.forEach((attachment) => {
        const fileId = attachment.uploadedFile?.id;
        if (!fileId || committedFileIdsRef.current.has(fileId)) {
          return;
        }

        deleteUploadedFile(fileId);
      });
    },
    [deleteUploadedFile],
  );

  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function useComposerContext() {
  const context = useContext(ComposerContext);
  if (!context) throw new Error('useComposerContext must be used within a ComposerProvider');
  return context;
}

export function useComposerAttachments() {
  const {
    attachments,
    errors,
    isUploading,
    progressByAssetId,
    onRemove,
    clearAttachments,
    markAttachmentsSubmitted,
  } = useComposerContext();
  return {
    attachments,
    errors,
    isUploading,
    progressByAssetId,
    onRemove,
    clearAttachments,
    markAttachmentsSubmitted,
  };
}
