import React, { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react'

import {
  MOBILE_WORKSPACE_CONTEXTS,
  resolveVisibleWorkspaceContexts,
  type MobileWorkspaceContext,
} from './mobile-workspace-config'

export { MOBILE_WORKSPACE_CONTEXTS, type MobileWorkspaceContext }

interface MobileWorkspaceContextValue {
  activeContext: MobileWorkspaceContext
  contexts: MobileWorkspaceContext[]
  headerKicker: string | null
  headerTitle: string
  setActiveContext: (context: MobileWorkspaceContext) => void
  setHeader: (input: { kicker?: string | null; title: string }) => void
}

interface MobileWorkspaceHeaderInput {
  kicker?: string | null
  title: string
}

const MobileWorkspaceContext = createContext<MobileWorkspaceContextValue | null>(null)

export const MobileWorkspaceProvider = ({ children }: PropsWithChildren) => {
  const [activeContext, setActiveContext] = useState<MobileWorkspaceContext>('inbox')
  const [headerKicker, setHeaderKicker] = useState<string | null>('Workspace')
  const [headerTitle, setHeaderTitle] = useState('Inbox')

  const setHeader = useCallback(({ kicker, title }: MobileWorkspaceHeaderInput) => {
    const nextKicker = kicker ?? null

    setHeaderKicker((currentKicker) => (currentKicker === nextKicker ? currentKicker : nextKicker))
    setHeaderTitle((currentTitle) => (currentTitle === title ? currentTitle : title))
  }, [])

  const value = useMemo<MobileWorkspaceContextValue>(
    () => ({
      activeContext,
      contexts: resolveVisibleWorkspaceContexts(activeContext),
      headerKicker,
      headerTitle,
      setActiveContext,
      setHeader,
    }),
    [activeContext, headerKicker, headerTitle, setHeader],
  )

  return <MobileWorkspaceContext.Provider value={value}>{children}</MobileWorkspaceContext.Provider>
}

export const useMobileWorkspace = () => {
  const value = useContext(MobileWorkspaceContext)

  if (!value) {
    throw new Error('useMobileWorkspace must be used within a MobileWorkspaceProvider')
  }

  return value
}
