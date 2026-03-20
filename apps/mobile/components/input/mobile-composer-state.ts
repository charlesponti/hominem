import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config'

export type MobileComposerMode = 'text' | 'voice'

export interface MobileComposerAttachment {
  id: string
  name: string
  type: string
}

export interface MobileComposerState {
  context: MobileWorkspaceContext
  text: string
  attachments: MobileComposerAttachment[]
  isRecording: boolean
  mode: MobileComposerMode
}

export function createInitialMobileComposerState(): MobileComposerState {
  return {
    context: 'inbox',
    text: '',
    attachments: [],
    isRecording: false,
    mode: 'text',
  }
}

export function setMobileComposerContext(
  state: MobileComposerState,
  context: MobileWorkspaceContext,
): MobileComposerState {
  return {
    ...state,
    context,
  }
}

export function setMobileComposerText(
  state: MobileComposerState,
  text: string,
): MobileComposerState {
  return {
    ...state,
    text,
  }
}

export function setMobileComposerAttachments(
  state: MobileComposerState,
  attachments: MobileComposerAttachment[],
): MobileComposerState {
  return {
    ...state,
    attachments,
  }
}

export function setMobileComposerRecording(
  state: MobileComposerState,
  isRecording: boolean,
): MobileComposerState {
  return {
    ...state,
    isRecording,
  }
}

export function setMobileComposerMode(
  state: MobileComposerState,
  mode: MobileComposerMode,
): MobileComposerState {
  return {
    ...state,
    mode,
  }
}
