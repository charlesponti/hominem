import { redirect, useMatches } from 'react-router'
import { useState, useCallback } from 'react'
import { ChatMessages } from '~/components/chat/ChatMessages.js'
import { ChatInput } from '~/components/chat/ChatInput.js'
import type { Route } from './+types/chat.$chatId'

export default function ChatPage({ params }: Route.ComponentProps) {
  const { chatId } = params
  const matches = useMatches()

  // Get userId from root loader data
  const rootData = matches.find((match) => match.id === 'root')?.data as
    | { supabaseUserId: string | null }
    | undefined
  const userId = rootData?.supabaseUserId ?? ''

  if (!userId) {
    // This shouldn't happen since root loader handles auth, but just in case
    redirect('/')
  }

  // Component state - specific to this component
  const [searchContext, setSearchContext] = useState('')

  // Component logic
  const clearChat = useCallback(() => {
    setSearchContext('')
  }, [])

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-background text-foreground">
      {/* Messages Area */}
      <ChatMessages chatId={chatId} status="idle" error={null} />

      {/* Input Area */}
      <div className="border-t bg-background p-4 space-y-2 pb-safe">
        {/* Search Context */}
        {searchContext && (
          <div className="text-sm text-muted-foreground">
            Search context: {searchContext}
            <button
              type="button"
              onClick={() => setSearchContext('')}
              className="ml-2 text-xs underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Input Form */}
        <ChatInput
          chatId={chatId}
          userId={userId}
          onStop={() => {}} // ChatInput handles this internally now
          isLoading={false} // ChatInput now manages its own loading state
          onAudioRecord={() => {}} // ChatInput handles this internally now
          onClearChat={clearChat}
          isSearching={false}
        />
      </div>
    </div>
  )
}
