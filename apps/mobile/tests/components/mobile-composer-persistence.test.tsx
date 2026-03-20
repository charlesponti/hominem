import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

import { InputProvider, useInputContext } from '../../components/input/input-context'
import {
  MobileWorkspaceProvider,
  useMobileWorkspace,
} from '../../components/workspace/mobile-workspace-context'

interface Snapshot {
  activeContext: string
  message: string
}

let snapshot: Snapshot | null = null
let setMessageRef: ((value: string) => void) | null = null
let setActiveContextRef:
  | ((context: 'inbox' | 'note' | 'chat' | 'search' | 'settings') => void)
  | null = null

function Probe() {
  const { activeContext, setActiveContext } = useMobileWorkspace()
  const { message, setMessage } = useInputContext()

  snapshot = {
    activeContext,
    message,
  }
  setMessageRef = setMessage
  setActiveContextRef = setActiveContext

  return null
}

describe('mobile composer draft persistence', () => {
  beforeEach(() => {
    snapshot = null
    setMessageRef = null
    setActiveContextRef = null
  })

  it('preserves the draft while workspace context changes', () => {
    act(() => {
      TestRenderer.create(
        <MobileWorkspaceProvider>
          <InputProvider>
            <Probe />
          </InputProvider>
        </MobileWorkspaceProvider>,
      )
    })

    act(() => {
      setMessageRef?.('Draft that should survive')
      setActiveContextRef?.('chat')
    })

    expect(snapshot).toEqual({
      activeContext: 'chat',
      message: 'Draft that should survive',
    })
  })
})
