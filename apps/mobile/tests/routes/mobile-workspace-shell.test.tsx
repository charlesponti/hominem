import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

import {
  MOBILE_WORKSPACE_BASE_CONTEXTS,
  MOBILE_WORKSPACE_LABELS,
  MOBILE_WORKSPACE_ROUTES,
  resolveVisibleWorkspaceContexts,
} from '../../components/workspace/mobile-workspace-config'
import {
  MobileWorkspaceProvider,
  useMobileWorkspace,
} from '../../components/workspace/mobile-workspace-context'

interface WorkspaceSnapshot {
  activeContext: string
  contexts: readonly string[]
}

let workspaceSnapshot: WorkspaceSnapshot | null = null
let setActiveContextRef: ((context: 'inbox' | 'note' | 'chat' | 'search' | 'settings') => void) | null =
  null

function WorkspaceProbe() {
  const { activeContext, contexts, setActiveContext } = useMobileWorkspace()

  workspaceSnapshot = {
    activeContext,
    contexts,
  }
  setActiveContextRef = setActiveContext

  return null
}

describe('mobile workspace shell state', () => {
  beforeEach(() => {
    workspaceSnapshot = null
    setActiveContextRef = null
  })

  it('defaults the shared mobile workspace to inbox and exposes all contexts', () => {
    act(() => {
      TestRenderer.create(
        <MobileWorkspaceProvider>
          <WorkspaceProbe />
        </MobileWorkspaceProvider>,
      )
    })

    expect(workspaceSnapshot).toEqual({
      activeContext: 'inbox',
      contexts: MOBILE_WORKSPACE_BASE_CONTEXTS,
    })
  })

  it('allows the active context to switch without remounting the provider', () => {
    act(() => {
      TestRenderer.create(
        <MobileWorkspaceProvider>
          <WorkspaceProbe />
        </MobileWorkspaceProvider>,
      )
    })

    expect(setActiveContextRef).toBeTypeOf('function')

    act(() => {
      setActiveContextRef?.('chat')
    })

    expect(workspaceSnapshot?.activeContext).toBe('chat')
  })

  it('defines labels and routes for the top workspace shell', () => {
    expect(MOBILE_WORKSPACE_LABELS).toEqual({
      inbox: 'Inbox',
      note: 'Note',
      chat: 'Chat',
      search: 'Search',
      settings: 'Settings',
    })

    expect(MOBILE_WORKSPACE_ROUTES).toEqual({
      inbox: '/(protected)/(tabs)/focus',
      note: null,
      chat: '/(protected)/(tabs)/sherpa',
      search: null,
      settings: '/(protected)/(tabs)/account',
    })
  })

  it('only exposes note and chat when they are the active contextual destination', () => {
    expect(resolveVisibleWorkspaceContexts('inbox')).toEqual(['inbox', 'search', 'settings'])
    expect(resolveVisibleWorkspaceContexts('note')).toEqual(['inbox', 'note', 'search', 'settings'])
    expect(resolveVisibleWorkspaceContexts('chat')).toEqual(['inbox', 'chat', 'search', 'settings'])
  })
})
