import type { SessionSource } from '@hominem/chat-services/types'

import { cn } from '../../lib/utils'

interface ContextAnchorProps {
  source: SessionSource
  showTitle?: boolean
  className?: string
}

const TYPE_LABELS: Record<string, string> = {
  note: 'NOTE',
  task: 'TASK',
  task_list: 'LIST',
  tracker: 'TRACKER',
}

export function ContextAnchor({ source, showTitle = true, className }: ContextAnchorProps) {
  if (source.kind === 'new') {
    return <div className={cn('text-sm font-medium leading-5', className)}>New conversation</div>
  }

  if (source.kind === 'thought') {
    if (!showTitle) {
      return <div className={cn('text-xs uppercase tracking-[0.08em] opacity-70', className)}>Conversation</div>
    }

    return <div className={cn('text-sm font-medium leading-5', className)}>{source.preview}</div>
  }

  if (!showTitle) {
    return <div className={cn('text-xs uppercase tracking-[0.08em] opacity-70', className)}>{TYPE_LABELS[source.type] ?? source.type}</div>
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate text-sm font-medium leading-5">{source.title}</div>
      <div className="truncate text-xs uppercase tracking-[0.08em] opacity-70">
        {TYPE_LABELS[source.type] ?? source.type}
      </div>
    </div>
  )
}
