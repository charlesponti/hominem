import type { MobileComposerAttachment, MobileComposerState } from './mobile-composer-state'
import { setMobileComposerAttachments, setMobileComposerMode, setMobileComposerRecording, setMobileComposerText } from './mobile-composer-state'

export interface PickedMobileAsset {
  uri: string
  fileName: string | null
  type: string | null
}

function mapPickedAssetToAttachment(asset: PickedMobileAsset): MobileComposerAttachment {
  const fallbackName = asset.uri.split('/').pop() ?? 'attachment'

  return {
    id: asset.uri,
    name: asset.fileName ?? fallbackName,
    type: asset.type ?? 'file',
  }
}

export function appendPickedAssetsToDraft(
  state: MobileComposerState,
  assets: PickedMobileAsset[],
): MobileComposerState {
  return setMobileComposerAttachments(state, [
    ...state.attachments,
    ...assets.map(mapPickedAssetToAttachment),
  ])
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
