import type { UploadedFile } from '@hominem/ui/types/upload'

import type { MobileComposerAttachment, MobileComposerState } from './mobile-composer-state'
import { setMobileComposerAttachments, setMobileComposerMode, setMobileComposerRecording, setMobileComposerText } from './mobile-composer-state'

export interface UploadedMobileAsset {
  localUri: string
  uploadedFile: UploadedFile
}

function getAttachmentType(uploadedFile: UploadedFile): string {
  if (uploadedFile.type !== 'unknown') {
    return uploadedFile.type
  }

  if (uploadedFile.mimetype.startsWith('image/')) return 'image'
  if (uploadedFile.mimetype.startsWith('audio/')) return 'audio'
  if (uploadedFile.mimetype.startsWith('video/')) return 'video'
  if (
    uploadedFile.mimetype === 'application/pdf' ||
    uploadedFile.mimetype.startsWith('text/') ||
    uploadedFile.mimetype.includes('word') ||
    uploadedFile.mimetype.includes('csv')
  ) {
    return 'document'
  }

  return 'file'
}

function mapUploadedAssetToAttachment(asset: UploadedMobileAsset): MobileComposerAttachment {
  return {
    id: asset.uploadedFile.id,
    name: asset.uploadedFile.originalName,
    type: getAttachmentType(asset.uploadedFile),
    localUri: asset.localUri,
    uploadedFile: asset.uploadedFile,
  }
}

export function appendUploadedAssetsToDraft(
  state: MobileComposerState,
  assets: UploadedMobileAsset[],
): MobileComposerState {
  return setMobileComposerAttachments(state, [
    ...state.attachments,
    ...assets.map(mapUploadedAssetToAttachment),
  ])
}

export interface PickedMobileAsset {
  uri: string
  fileName: string | null
  type: string | null
}

export function applyVoiceTranscriptToDraft(
  state: MobileComposerState,
  transcript: string,
): MobileComposerState {
  const trimmedTranscript = transcript.trim()
  const nextText = state.text.trim().length > 0 ? `${state.text}\n${trimmedTranscript}` : trimmedTranscript

  return setMobileComposerMode(
    setMobileComposerRecording(setMobileComposerText(state, nextText), false),
    'text',
  )
}

export function removeAttachmentFromDraft(
  state: MobileComposerState,
  attachmentId: string,
): MobileComposerState {
  return setMobileComposerAttachments(
    state,
    state.attachments.filter((attachment) => attachment.id !== attachmentId),
  )
}
