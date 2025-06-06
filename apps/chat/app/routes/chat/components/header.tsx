import type { ChatMessageSelect } from '@hominem/utils/types'
import { Bot, Settings, User, Wrench } from 'lucide-react'
import { memo, useMemo } from 'react'

interface MessageHeaderProps {
  role: ChatMessageSelect['role']
}

const roleConfig: Record<
  ChatMessageSelect['role'],
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    className: string
  }
> = {
  user: {
    label: 'You',
    icon: User,
    className: 'text-blue-500',
  },
  assistant: {
    label: 'Assistant',
    icon: Bot,
    className: 'text-violet-500',
  },
  tool: {
    label: 'Tool',
    icon: Wrench,
    className: 'text-amber-500',
  },
  system: {
    label: 'System',
    icon: Settings,
    className: 'text-slate-500',
  },
}

export const MessageHeader = memo<MessageHeaderProps>(function MessageHeader({ role }) {
  const config = useMemo(() => roleConfig[role], [role])
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2 mb-2" data-testid="message-header">
      <div
        className={`p-1.5 rounded-lg bg-gradient-to-br from-${config.className}/10 to-${config.className}/20`}
      >
        <Icon className={`w-4 h-4 ${config.className}`} />
      </div>
      <span className={`text-sm font-medium ${config.className}`}>{config.label}</span>
    </div>
  )
})
