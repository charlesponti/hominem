import type { ChatMessageSelect } from '@hominem/utils/types'
import { cn } from '~/lib/utils'
import { Card } from '../ui/card.js'
import { MessageContent } from './content.js'
import { MessageDetails } from './details.js'
import { MessageHeader } from './header.js'

export function ChatMessage({ message }: { message: ChatMessageSelect }) {
  const { content, role } = message

  const isUndefinedRole = !['user', 'assistant', 'tool', 'system'].includes(role)
  return (
    <Card
      className={cn(
        'group p-3 sm:p-4 min-w-0',
        {
          'bg-[#fbfbfb]/50 hover:bg-[#fbfbfb]/70': role === 'user',
          'bg-[#fffbf7]/50 hover:bg-[#fffbf7]/70': role === 'assistant',
          'bg-accent/30 hover:bg-accent/40': role === 'tool',
          'bg-muted/50 hover:bg-muted/70': role === 'system' || isUndefinedRole,
        },
        'transition-colors duration-200'
      )}
      data-testid={`message-${role}`}
    >
      <div className="space-y-2 break-words">
        <MessageHeader role={role} />
        <MessageContent content={content} />
        <MessageDetails
          toolCalls={message.toolCalls}
          reasoning={message.reasoning}
          files={message.files}
        />
      </div>
    </Card>
  )
}
