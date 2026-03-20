import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config'

export type MobileComposerPosture = 'capture' | 'draft' | 'reply' | 'search' | 'hidden'

export interface MobileComposerPresentation {
  placeholder: string
  primaryActionLabel: string
  secondaryActionLabel: string | null
  showsAttachmentButton: boolean
  showsVoiceButton: boolean
  posture: MobileComposerPosture
}

interface DeriveMobileComposerPresentationInput {
  context: MobileWorkspaceContext
  hasText: boolean
  isRecording: boolean
}

export function deriveMobileComposerPresentation(
  input: DeriveMobileComposerPresentationInput,
): MobileComposerPresentation {
  if (input.context === 'note') {
    return {
      placeholder: 'Keep writing this note',
      primaryActionLabel: 'Add to note',
      secondaryActionLabel: 'Discuss note',
      showsAttachmentButton: true,
      showsVoiceButton: true,
      posture: 'draft',
    }
  }

  if (input.context === 'chat') {
    return {
      placeholder: input.isRecording ? 'Listening…' : 'Reply to your assistant',
      primaryActionLabel: 'Send',
      secondaryActionLabel: 'Save as note',
      showsAttachmentButton: true,
      showsVoiceButton: true,
      posture: 'reply',
    }
  }

  if (input.context === 'search') {
    return {
      placeholder: 'Search notes, chats, and files',
      primaryActionLabel: 'Search',
      secondaryActionLabel: null,
      showsAttachmentButton: false,
      showsVoiceButton: false,
      posture: 'search',
    }
  }

  if (input.context === 'settings') {
    return {
      placeholder: '',
      primaryActionLabel: '',
      secondaryActionLabel: null,
      showsAttachmentButton: false,
      showsVoiceButton: false,
      posture: 'hidden',
    }
  }

  return {
    placeholder: input.isRecording ? 'Listening…' : 'Write a note, ask something, or drop a file',
    primaryActionLabel: input.hasText ? 'Save note' : 'Save note',
    secondaryActionLabel: 'Ask assistant',
    showsAttachmentButton: true,
    showsVoiceButton: true,
    posture: 'capture',
  }
}
