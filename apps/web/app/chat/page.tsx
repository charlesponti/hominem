'use client'

import { ChatInterface } from '@/components/chat-interface'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CHAT_ENDPOINTS, useChat } from '@/lib/hooks/use-chat'
import { useState } from 'react'

export default function UnifiedChatPage() {
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
    showIntermediateSteps: showDebugInfo,
    initialMessages: [],
  })

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 bg-muted font-medium flex justify-between items-center">
        <div>Hominem AI Assistant</div>
        <div className="flex items-center space-x-2">
          <Switch id="show-debug" checked={showDebugInfo} onCheckedChange={setShowDebugInfo} />
          <Label htmlFor="show-debug">Show debug info</Label>
        </div>
      </div>
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
    </Card>
  )
}
