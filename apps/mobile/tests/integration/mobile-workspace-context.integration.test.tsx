import React from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it } from 'vitest'

import {
  MobileWorkspaceProvider,
  useMobileWorkspace,
} from '../../components/workspace/mobile-workspace-context'

interface HeaderControls {
  setHeader: ({ kicker, title }: { kicker?: string | null; title: string }) => void
}

function createHeaderProbe(ref: { current: HeaderControls | null }) {
  return function HeaderProbe() {
    const { setHeader } = useMobileWorkspace()
    ref.current = { setHeader }
    return null
  }
}

describe('mobile workspace context', () => {
  it('keeps setHeader stable after header updates', () => {
    const ref: { current: HeaderControls | null } = { current: null }
    const HeaderProbe = createHeaderProbe(ref)

    act(() => {
      create(
        <MobileWorkspaceProvider>
          <HeaderProbe />
        </MobileWorkspaceProvider>,
      )
    })

    const firstSetHeader = ref.current?.setHeader

    expect(firstSetHeader).toBeTypeOf('function')

    act(() => {
      firstSetHeader?.({
        kicker: 'Notes-first assistant',
        title: 'Workspace',
      })
    })

    expect(ref.current?.setHeader).toBe(firstSetHeader)
  })
})
