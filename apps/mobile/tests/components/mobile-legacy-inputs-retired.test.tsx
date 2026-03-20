import React from 'react'
import { render } from '@testing-library/react-native'

import { CaptureBar } from '../../components/capture/capture-bar'
import { ChatInput } from '../../components/chat/chat-input'
import { InputDock } from '../../components/input/input-dock'

describe('mobile legacy input components', () => {
  it('renders the retired capture bar as null', async () => {
    const root = await render(<CaptureBar />)

    expect(root.toJSON()).toBeNull()
  })

  it('renders the retired input dock as null', async () => {
    const root = await render(<InputDock />)

    expect(root.toJSON()).toBeNull()
  })

  it('renders the retired chat input as null', async () => {
    const root = await render(
      <ChatInput message="" onMessageChange={() => undefined} onSendMessage={() => undefined} />,
    )

    expect(root.toJSON()).toBeNull()
  })
})
