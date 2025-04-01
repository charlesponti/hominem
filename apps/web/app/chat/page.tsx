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
    <div className="h-full flex flex-col">
      <div className="py-3 pr-2 flex sm:flex-row justify-end items-center gap-2 bg-none">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-debug"
            checked={showDebugInfo}
            onCheckedChange={setShowDebugInfo}
            className="data-[state=checked]:bg-primary"
          />
          <BugIcon size={16} className="text-primary" />
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
