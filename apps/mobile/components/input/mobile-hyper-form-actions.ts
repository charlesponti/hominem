import type { MobileHyperFormAttachment, MobileHyperFormState } from './mobile-hyper-form-state'
import { setMobileHyperFormAttachments, setMobileHyperFormMode, setMobileHyperFormRecording, setMobileHyperFormText } from './mobile-hyper-form-state'

export interface PickedMobileAsset {
  uri: string
  fileName: string | null
  type: string | null
}

function mapPickedAssetToAttachment(asset: PickedMobileAsset): MobileHyperFormAttachment {
  const fallbackName = asset.uri.split('/').pop() ?? 'attachment'

  return {
    id: asset.uri,
    name: asset.fileName ?? fallbackName,
    type: asset.type ?? 'file',
  }
}

export function appendPickedAssetsToDraft(
  state: MobileHyperFormState,
  assets: PickedMobileAsset[],
): MobileHyperFormState {
  return setMobileHyperFormAttachments(state, [
    ...state.attachments,
    ...assets.map(mapPickedAssetToAttachment),
  ])
}

export function applyVoiceTranscriptToDraft(
  state: MobileHyperFormState,
  transcript: string,
): MobileHyperFormState {
  const trimmedTranscript = transcript.trim()
  const nextText = state.text.trim().length > 0 ? `${state.text}\n${trimmedTranscript}` : trimmedTranscript

  return setMobileHyperFormMode(
    setMobileHyperFormRecording(setMobileHyperFormText(state, nextText), false),
    'text',
  )
}

export function removeAttachmentFromDraft(
  state: MobileHyperFormState,
  attachmentId: string,
): MobileHyperFormState {
  return setMobileHyperFormAttachments(
    state,
    state.attachments.filter((attachment) => attachment.id !== attachmentId),
  )
}
