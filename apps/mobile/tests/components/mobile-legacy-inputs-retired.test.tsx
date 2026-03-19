import React from 'react'
import TestRenderer from 'react-test-renderer'

import { CaptureBar } from '../../components/capture/capture-bar'
import { ChatInput } from '../../components/chat/chat-input'
import { InputDock } from '../../components/input/input-dock'

describe('mobile legacy input components', () => {
  it('renders the retired capture bar as null', () => {
    const tree = TestRenderer.create(<CaptureBar />)

    expect(tree.toJSON()).toBeNull()
  })

  it('renders the retired input dock as null', () => {
    const tree = TestRenderer.create(<InputDock />)

    expect(tree.toJSON()).toBeNull()
  })

  it('renders the retired chat input as null', () => {
    const tree = TestRenderer.create(
      <ChatInput message="" onMessageChange={() => undefined} onSendMessage={() => undefined} />,
    )

    expect(tree.toJSON()).toBeNull()
  })
})
