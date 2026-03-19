import {
  createInitialMobileHyperFormState,
  setMobileHyperFormAttachments,
  setMobileHyperFormContext,
  setMobileHyperFormRecording,
  setMobileHyperFormText,
} from '../../components/input/mobile-hyper-form-state'

describe('mobile hyper form state', () => {
  it('starts with an inbox draft and no staged content', () => {
    expect(createInitialMobileHyperFormState()).toEqual({
      context: 'inbox',
      text: '',
      attachments: [],
      isRecording: false,
      mode: 'text',
    })
  })

  it('preserves draft content while switching workspace contexts', () => {
    const initialState = createInitialMobileHyperFormState()
    const withText = setMobileHyperFormText(initialState, 'Draft a note about today')
    const withAttachment = setMobileHyperFormAttachments(withText, [
      { id: 'asset-1', name: 'receipt.png', type: 'image' },
    ])
    const withVoice = setMobileHyperFormRecording(withAttachment, true)
    const inChat = setMobileHyperFormContext(withVoice, 'chat')

    expect(inChat).toEqual({
      context: 'chat',
      text: 'Draft a note about today',
      attachments: [{ id: 'asset-1', name: 'receipt.png', type: 'image' }],
      isRecording: true,
      mode: 'text',
    })
  })
})
