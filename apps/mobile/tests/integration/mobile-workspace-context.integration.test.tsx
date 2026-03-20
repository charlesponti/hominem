import React from 'react'
import { act, render, waitFor } from '@testing-library/react-native'
import { describe, expect, it } from 'vitest'

import {
  MobileWorkspaceProvider,
  useMobileWorkspace,
} from '../../components/workspace/mobile-workspace-context'

interface WorkspaceControls {
  setActiveContext: (context: 'inbox' | 'note' | 'chat' | 'search' | 'settings') => void
}

function createWorkspaceProbe(ref: { current: WorkspaceControls | null }) {
  return function WorkspaceProbe() {
    const { setActiveContext } = useMobileWorkspace()
    ref.current = { setActiveContext }
    return null
  }
}

describe('mobile workspace context', () => {
  it('keeps setActiveContext stable after context updates', async () => {
    const ref: { current: WorkspaceControls | null } = { current: null }
    const WorkspaceProbe = createWorkspaceProbe(ref)

    await render(
      <MobileWorkspaceProvider>
        <WorkspaceProbe />
      </MobileWorkspaceProvider>,
    )

    const firstSetActiveContext = ref.current?.setActiveContext

    expect(firstSetActiveContext).toBeTypeOf('function')

    await act(() => {
      firstSetActiveContext?.('chat')
    })

    await waitFor(() => {
      expect(ref.current?.setActiveContext).toBe(firstSetActiveContext)
    })
  })
})
