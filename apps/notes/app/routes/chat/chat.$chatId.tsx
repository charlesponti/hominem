import { useState } from 'react'
import { redirect, useMatches } from 'react-router'
import { ChatInput } from '~/components/chat/ChatInput.js'
import { ChatMessages } from '~/components/chat/ChatMessages.js'
import type { Route } from './+types/chat.$chatId'

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params
  const matches = useMatches()
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle')
  const [error, setError] = useState<Error | null>(null)

  // Get userId from root loader data
  const rootData = matches.find((match) => match.id === 'root')?.data as
    | { supabaseId: string | null }
    | undefined
  const userId = rootData?.supabaseId ?? ''

  if (!userId) {
    redirect('/')
  }

  const handleMessageStatusChange = (newStatus: typeof status, newError?: Error | null) => {
    setStatus(newStatus)
    setError(newError || null)
  }

  return (
    <div className="flex flex-col h-full w-full mx-auto text-foreground">
      <div className="flex-1 max-w-3xl mx-auto">
        <ChatMessages chatId={chatId} status={status} error={error} />
      </div>

      <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="max-w-3xl mx-auto">
          <ChatInput chatId={chatId} onStatusChange={handleMessageStatusChange} />
        </div>
      </div>
    </div>
  )
}
