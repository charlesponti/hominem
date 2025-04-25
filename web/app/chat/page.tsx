'use client'

import { ChatInterface } from '@/components/chat-interface'
import { Switch } from '@/components/ui/switch'
import { CHAT_ENDPOINTS, useChat } from '@/lib/hooks/use-chat'
import { BugIcon } from 'lucide-react'
import { useState } from 'react'

export default function ChatPage() {
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    resetConversation,
    startNewChat,
    toolCalls,
    toolResults,
  } = useChat({
    endpoint: CHAT_ENDPOINTS.CHAT,
    showDebugInfo,
    initialMessages: [],
  })

  return (
    <div className="h-full flex flex-col ml-14 md:ml-16">
      <div className="pt-6 pb-4 px-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
        <h1 className="font-serif text-base">For you</h1>
        <div className="flex items-center space-x-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Debug</span>
          <Switch
            id="show-debug"
            checked={showDebugInfo}
            onCheckedChange={setShowDebugInfo}
            className="data-[state=checked]:bg-primary"
          />
          <BugIcon size={14} className="text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage.mutate}
          isLoading={isLoading}
          error={!!error}
          onReset={resetConversation.mutate}
          onNewChat={startNewChat.mutate}
          toolCalls={toolCalls}
          toolResults={toolResults}
          showDebugInfo={showDebugInfo}
        />
      </div>
    </div>
  )
}
