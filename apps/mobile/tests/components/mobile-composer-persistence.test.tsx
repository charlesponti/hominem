import React from 'react'
import { act, render, waitFor } from '@testing-library/react-native'

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

  it('preserves the draft while workspace context changes', async () => {
    await render(
      <MobileWorkspaceProvider>
        <InputProvider>
          <Probe />
        </InputProvider>
      </MobileWorkspaceProvider>,
    )

    await act(() => {
      setMessageRef?.('Draft that should survive')
      setActiveContextRef?.('note')
    })

    await waitFor(() => {
      expect(snapshot).toEqual({
        activeContext: 'note',
        message: 'Draft that should survive',
      })
    })
  })
})
