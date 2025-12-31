import { useRef, useState } from 'react'
import { ChatInput } from '~/components/chat/ChatInput'
import { ChatMessages } from '~/components/chat/ChatMessages'
import { requireAuth } from '~/lib/guards'
import { useChatKeyboardShortcuts } from '~/lib/hooks/use-chat-keyboard-shortcuts'
import type { Route } from './+types/chat.$chatId'

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request)
}

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const messagesComponentRef = useRef<{ showSearch: () => void }>(null)

  const handleMessageStatusChange = (newStatus: typeof status, newError?: Error | null) => {
    setStatus(newStatus)
    setError(newError || null)
  }

  // Keyboard shortcuts
  useChatKeyboardShortcuts({
    onFocusInput: () => {
      inputRef.current?.focus()
    },
    onScrollToTop: () => {
      messagesRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onScrollToBottom: () => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
    },
    enabled: true,
  })

  return (
    <div className="flex flex-col size-full mx-auto text-foreground">
      <div className="flex-1" ref={messagesRef}>
        <ChatMessages ref={messagesComponentRef} chatId={chatId} status={status} error={error} />
      </div>

      <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <ChatInput ref={inputRef} chatId={chatId} onStatusChange={handleMessageStatusChange} />
      </div>
    </div>
  )
}
