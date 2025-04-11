import { cn } from '@/lib/utils'
import type { ChatMessage } from '@hominem/utils/schema'
import { Card } from '../card'
import { MessageContent } from './content'
import { MessageDetails } from './details'
import { MessageHeader } from './header'

export function Message({ message }: { message: ChatMessage }) {
  const { content, role } = message
  const getBackgroundColor = (role: ChatMessage['role']) => {
    switch (role) {
      case 'user':
        return 'bg-secondary/50 hover:bg-secondary/70'
      case 'assistant':
        return 'bg-primary/5 hover:bg-primary/10'
      case 'tool':
        return 'bg-accent/30 hover:bg-accent/40'
      case 'system':
      default:
        return 'bg-muted/50 hover:bg-muted/70'
    }
  }

  return (
    <Card
      className={cn(
        'group p-3 sm:p-4 min-w-0',
        getBackgroundColor(role),
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
