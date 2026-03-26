import { appendTranscriptToDraft, getAttachmentType } from '@hominem/ui/composer';
import type { UploadedFile } from '@hominem/ui/types/upload';

import type { MobileComposerAttachment, MobileComposerState } from './composer-state.mobile';
import {
  setMobileComposerAttachments,
  setMobileComposerMode,
  setMobileComposerRecording,
  setMobileComposerText,
} from './composer-state.mobile';

export interface UploadedMobileAsset {
  localUri: string;
  uploadedFile: UploadedFile;
}

function mapUploadedAssetToAttachment(asset: UploadedMobileAsset): MobileComposerAttachment {
  return {
    id: asset.uploadedFile.id,
    name: asset.uploadedFile.originalName,
    type: getAttachmentType(asset.uploadedFile),
    localUri: asset.localUri,
    uploadedFile: asset.uploadedFile,
  };
}

export function appendUploadedAssetsToDraft(
  state: MobileComposerState,
  assets: UploadedMobileAsset[],
): MobileComposerState {
  return setMobileComposerAttachments(state, [
    ...state.attachments,
    ...assets.map(mapUploadedAssetToAttachment),
  ]);
}

export interface PickedMobileAsset {
  uri: string;
  fileName: string | null;
  type: string | null;
}

export function applyVoiceTranscriptToDraft(
  state: MobileComposerState,
  transcript: string,
): MobileComposerState {
  const nextText = appendTranscriptToDraft(state.text, transcript);

  return setMobileComposerMode(
    setMobileComposerRecording(setMobileComposerText(state, nextText), false),
    'text',
  );
}

export function removeAttachmentFromDraft(
  state: MobileComposerState,
  attachmentId: string,
): MobileComposerState {
  return setMobileComposerAttachments(
    state,
    state.attachments.filter((attachment) => attachment.id !== attachmentId),
  );
}
