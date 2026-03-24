import { describe, expect, it } from 'vitest'

import {
  appendUploadedAssetsToDraft,
  applyVoiceTranscriptToDraft,
  removeAttachmentFromDraft,
} from '../../components/input/mobile-composer-actions'
import { createInitialMobileComposerState } from '../../components/input/mobile-composer-state'

describe('mobile composer actions', () => {
  it('maps uploaded assets into shared draft attachments', () => {
    const state = appendUploadedAssetsToDraft(createInitialMobileComposerState(), [
      {
        localUri: 'file:///tmp/receipt.png',
        uploadedFile: {
          id: 'file-1',
          originalName: 'receipt.png',
          type: 'image',
          mimetype: 'image/png',
          size: 120,
          url: 'https://cdn.example.com/receipt.png',
          uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
      {
        localUri: 'file:///tmp/summary.pdf',
        uploadedFile: {
          id: 'file-2',
          originalName: 'summary.pdf',
          type: 'document',
          mimetype: 'application/pdf',
          size: 420,
          url: 'https://cdn.example.com/summary.pdf',
          uploadedAt: new Date('2026-01-01T00:00:01.000Z'),
          textContent: 'Quarterly summary',
        },
      },
    ])

    expect(state.attachments).toEqual([
      {
        id: 'file-1',
        localUri: 'file:///tmp/receipt.png',
        name: 'receipt.png',
        type: 'image',
        uploadedFile: {
          id: 'file-1',
          originalName: 'receipt.png',
          type: 'image',
          mimetype: 'image/png',
          size: 120,
          url: 'https://cdn.example.com/receipt.png',
          uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
      {
        id: 'file-2',
        localUri: 'file:///tmp/summary.pdf',
        name: 'summary.pdf',
        type: 'document',
        uploadedFile: {
          id: 'file-2',
          originalName: 'summary.pdf',
          type: 'document',
          mimetype: 'application/pdf',
          size: 420,
          url: 'https://cdn.example.com/summary.pdf',
          uploadedAt: new Date('2026-01-01T00:00:01.000Z'),
          textContent: 'Quarterly summary',
        },
      },
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
