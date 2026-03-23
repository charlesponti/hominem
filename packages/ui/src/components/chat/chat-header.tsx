import type { SessionSource } from '@hominem/chat-services/types'
import { Search, Plus } from 'lucide-react'

import { Button } from '../ui/button'
import { ContextAnchor } from './context-anchor'
import type { ChatRenderIcon } from './chat.types'

interface ChatHeaderProps {
  topInset: number
  resolvedSource: SessionSource
  statusCopy: string
  onOpenSearch: () => void
  onOpenMenu: () => void
  renderIcon: ChatRenderIcon
}

export function ChatHeader({
  topInset,
  resolvedSource,
  statusCopy,
  onOpenSearch,
  onOpenMenu,
  renderIcon,
}: ChatHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border-default bg-bg-elevated px-3 pb-1" style={{ paddingTop: Math.max(topInset, 6) }}>
      <div className="flex min-h-10 items-center gap-3">
        <div className="min-w-0 flex-1 px-2 text-center">
          <ContextAnchor source={resolvedSource} showTitle={false} className="truncate" />
          {statusCopy ? <div className="truncate text-xs uppercase tracking-[0.08em] opacity-70">{statusCopy}</div> : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSearch}
            aria-label="Search messages"
            className="h-9 w-9 rounded-full p-0"
          >
            {renderIcon('magnifying-glass', { color: 'currentColor', size: 14 }) ?? <Search className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenMenu}
            aria-label="Conversation actions"
            className="h-9 w-9 rounded-full p-0"
          >
            {renderIcon('plus', { color: 'currentColor', size: 15 }) ?? <Plus className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
