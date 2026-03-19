import { describe, expect, it, vi } from 'vitest'

import { runChatSubmitAction } from '../../components/chat/chat-submit-action'

describe('chat submit action', () => {
  it('sends a trimmed message and clears the draft', () => {
    const sendChatMessage = vi.fn(async () => ({ messages: [], function_calls: [] }))
    const setMessage = vi.fn()

    expect(
      runChatSubmitAction({
        message: '  hello world  ',
        sendChatMessage,
        setMessage,
      }),
    ).toBe(true)

    expect(sendChatMessage).toHaveBeenCalledWith('hello world')
    expect(setMessage).toHaveBeenCalledWith('')
  })

  it('does not send or clear when the draft is blank', () => {
    const sendChatMessage = vi.fn(async () => ({ messages: [], function_calls: [] }))
    const setMessage = vi.fn()

    expect(
      runChatSubmitAction({
        message: '   ',
        sendChatMessage,
        setMessage,
      }),
    ).toBe(false)

    expect(sendChatMessage).not.toHaveBeenCalled()
    expect(setMessage).not.toHaveBeenCalled()
  })
})
