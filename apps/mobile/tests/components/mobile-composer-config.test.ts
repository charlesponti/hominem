import { describe, expect, it } from 'vitest'

import { deriveMobileComposerPresentation } from '../../components/input/mobile-composer-config'

describe('mobile composer presentation', () => {
  it('returns inbox capture defaults', () => {
    expect(
      deriveMobileComposerPresentation({
        context: 'inbox',
        hasText: false,
        isRecording: false,
      }),
    ).toEqual({
      placeholder: 'Write a note, ask something, or drop a file',
      primaryActionLabel: 'Save note',
      secondaryActionLabel: 'Ask assistant',
      showsAttachmentButton: true,
      showsVoiceButton: true,
      posture: 'capture',
    })
  })

  it('returns note drafting defaults', () => {
    expect(
      deriveMobileComposerPresentation({
        context: 'note',
        hasText: true,
        isRecording: false,
      }),
    ).toEqual({
      placeholder: 'Keep writing this note',
      primaryActionLabel: 'Add to note',
      secondaryActionLabel: 'Discuss note',
      showsAttachmentButton: true,
      showsVoiceButton: true,
      posture: 'draft',
    })
  })

  it('returns chat reply posture', () => {
    expect(
      deriveMobileComposerPresentation({
        context: 'chat',
        hasText: true,
        isRecording: false,
      }),
    ).toEqual({
      placeholder: 'Reply to your assistant',
      primaryActionLabel: 'Send',
      secondaryActionLabel: 'Save as note',
      showsAttachmentButton: true,
      showsVoiceButton: true,
      posture: 'reply',
    })
  })

  it('returns search posture without create actions', () => {
    expect(
      deriveMobileComposerPresentation({
        context: 'search',
        hasText: false,
        isRecording: false,
      }),
    ).toEqual({
      placeholder: 'Search notes, chats, and files',
      primaryActionLabel: 'Search',
      secondaryActionLabel: null,
      showsAttachmentButton: false,
      showsVoiceButton: false,
      posture: 'search',
    })
  })
})
