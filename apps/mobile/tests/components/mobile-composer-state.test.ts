import {
  createInitialMobileComposerState,
  setMobileComposerAttachments,
  setMobileComposerContext,
  setMobileComposerRecording,
  setMobileComposerText,
} from '../../components/input/mobile-composer-state'

describe('mobile composer state', () => {
  it('starts with an inbox draft and no staged content', () => {
    expect(createInitialMobileComposerState()).toEqual({
      context: 'inbox',
      text: '',
      attachments: [],
      isRecording: false,
      mode: 'text',
    })
  })

  it('preserves draft content while switching workspace contexts', () => {
    const initialState = createInitialMobileComposerState()
    const withText = setMobileComposerText(initialState, 'Draft a note about today')
    const withAttachment = setMobileComposerAttachments(withText, [
      { id: 'asset-1', name: 'receipt.png', type: 'image' },
    ])
    const withVoice = setMobileComposerRecording(withAttachment, true)
    const inChat = setMobileComposerContext(withVoice, 'chat')

    expect(inChat).toEqual({
      context: 'chat',
      text: 'Draft a note about today',
      attachments: [{ id: 'asset-1', name: 'receipt.png', type: 'image' }],
      isRecording: true,
      mode: 'text',
    })
  })
})
