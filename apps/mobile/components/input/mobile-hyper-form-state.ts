import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config'

export type MobileHyperFormMode = 'text' | 'voice'

export interface MobileHyperFormAttachment {
  id: string
  name: string
  type: string
}

export interface MobileHyperFormState {
  context: MobileWorkspaceContext
  text: string
  attachments: MobileHyperFormAttachment[]
  isRecording: boolean
  mode: MobileHyperFormMode
}

export function createInitialMobileHyperFormState(): MobileHyperFormState {
  return {
    context: 'inbox',
    text: '',
    attachments: [],
    isRecording: false,
    mode: 'text',
  }
}

export function setMobileHyperFormContext(
  state: MobileHyperFormState,
  context: MobileWorkspaceContext,
): MobileHyperFormState {
  return {
    ...state,
    context,
  }
}

export function setMobileHyperFormText(
  state: MobileHyperFormState,
  text: string,
): MobileHyperFormState {
  return {
    ...state,
    text,
  }
}

export function setMobileHyperFormAttachments(
  state: MobileHyperFormState,
  attachments: MobileHyperFormAttachment[],
): MobileHyperFormState {
  return {
    ...state,
    attachments,
  }
}

export function setMobileHyperFormRecording(
  state: MobileHyperFormState,
  isRecording: boolean,
): MobileHyperFormState {
  return {
    ...state,
    isRecording,
  }
}

export function setMobileHyperFormMode(
  state: MobileHyperFormState,
  mode: MobileHyperFormMode,
): MobileHyperFormState {
  return {
    ...state,
    mode,
  }
}
