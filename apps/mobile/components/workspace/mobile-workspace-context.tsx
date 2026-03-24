import { usePathname } from 'expo-router';
import React, { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import {
  MOBILE_WORKSPACE_CONTEXTS,
  resolveVisibleWorkspaceContexts,
  type MobileWorkspaceContext,
} from './mobile-workspace-config';

export { MOBILE_WORKSPACE_CONTEXTS, type MobileWorkspaceContext };

interface MobileWorkspaceContextValue {
  activeContext: MobileWorkspaceContext;
  contexts: MobileWorkspaceContext[];
  setActiveContext: (context: MobileWorkspaceContext) => void;
}

const MobileWorkspaceContext = createContext<MobileWorkspaceContextValue | null>(null);

function resolveRouteWorkspaceContext(
  pathname: string,
  selectedContext: MobileWorkspaceContext,
): MobileWorkspaceContext {
  if (pathname.includes('/sherpa')) {
    return 'chat';
  }

  if (pathname.includes('/account')) {
    return 'settings';
  }

  if (selectedContext === 'note' || selectedContext === 'search') {
    return selectedContext;
  }

  return 'inbox';
}

export const MobileWorkspaceProvider = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const [selectedContext, setActiveContext] = useState<MobileWorkspaceContext>('inbox');
  const activeContext = useMemo(
    () => resolveRouteWorkspaceContext(pathname, selectedContext),
    [pathname, selectedContext],
  );

  const value = useMemo<MobileWorkspaceContextValue>(
    () => ({
      activeContext,
      contexts: resolveVisibleWorkspaceContexts(activeContext),
      setActiveContext,
    }),
    [activeContext],
  );

  return (
    <MobileWorkspaceContext.Provider value={value}>{children}</MobileWorkspaceContext.Provider>
  );
};

export const useMobileWorkspace = () => {
  const value = useContext(MobileWorkspaceContext);

  if (!value) {
    throw new Error('useMobileWorkspace must be used within a MobileWorkspaceProvider');
  }

  return value;
};
