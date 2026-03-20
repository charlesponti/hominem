import { describe, expect, it } from 'vitest'

import {
  appendPickedAssetsToDraft,
  applyVoiceTranscriptToDraft,
  removeAttachmentFromDraft,
} from '../../components/input/mobile-composer-actions'
import { createInitialMobileComposerState } from '../../components/input/mobile-composer-state'

describe('mobile composer actions', () => {
  it('maps picked assets into shared draft attachments', () => {
    const state = appendPickedAssetsToDraft(createInitialMobileComposerState(), [
      {
        uri: 'file:///tmp/receipt.png',
        fileName: 'receipt.png',
        type: 'image',
      },
      {
        uri: 'file:///tmp/summary.pdf',
        fileName: null,
        type: 'document',
      },
    ])

    expect(state.attachments).toEqual([
      { id: 'file:///tmp/receipt.png', name: 'receipt.png', type: 'image' },
      { id: 'file:///tmp/summary.pdf', name: 'summary.pdf', type: 'document' },
    ])
  })

  it('appends a voice transcript to existing draft text', () => {
    const initialState = {
      ...createInitialMobileComposerState(),
      text: 'Existing draft',
    }

    expect(applyVoiceTranscriptToDraft(initialState, 'captured idea')).toEqual({
      ...initialState,
      mode: 'text',
      isRecording: false,
      text: 'Existing draft\ncaptured idea',
    })
  })

  it('removes an attachment from the shared draft', () => {
    const initialState = {
      ...createInitialMobileComposerState(),
      attachments: [
        { id: 'one', name: 'one.png', type: 'image' },
        { id: 'two', name: 'two.pdf', type: 'document' },
      ],
    }

    expect(removeAttachmentFromDraft(initialState, 'one').attachments).toEqual([
      { id: 'two', name: 'two.pdf', type: 'document' },
    ])
  })
})
