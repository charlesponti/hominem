import type { MobileWorkspaceContext } from './mobile-workspace-config'

export type MobileWorkspaceView = 'stack' | 'note' | 'search'

export function resolveMobileWorkspaceView(context: MobileWorkspaceContext): MobileWorkspaceView {
  if (context === 'note') {
    return 'note'
  }

  if (context === 'search') {
    return 'search'
  }

  return 'stack'
}
