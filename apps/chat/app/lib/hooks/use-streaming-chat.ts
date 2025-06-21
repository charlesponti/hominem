import { useCallback, useRef, useState } from 'react'
import type { ProcessedFile } from '~/lib/services/file-processor.server.js'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: ProcessedFile[]
  audioUrl?: string
  isStreaming?: boolean
}

export interface StreamingChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  currentStreamingMessage: string
}

export interface UseStreamingChatReturn {
  state: StreamingChatState
  sendMessage: (
    content: string,
    files?: ProcessedFile[],
    searchContext?: string,
    voiceMode?: boolean
  ) => Promise<void>
  clearChat: () => void
  stopStreaming: () => void
}

interface StreamResponse {
  type: 'content' | 'audio' | 'complete' | 'error'
  content?: string
  fullResponse?: string
  audio?: {
    fileId: string
    url: string
    duration: number
    voice: string
  }
  error?: string
  finishReason?: string
}

export function useStreamingChat(): UseStreamingChatReturn {
  const [state, setState] = useState<StreamingChatState>({
    messages: [],
    isStreaming: false,
    error: null,
    currentStreamingMessage: '',
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMessageIdRef = useRef<string>('')

  const sendMessage = useCallback(
    async (
      content: string,
      files: ProcessedFile[] = [],
      searchContext?: string,
      voiceMode = false
    ) => {
      // Stop any current streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        files,
      }

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`
      currentMessageIdRef.current = assistantMessageId

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }

      // Add messages to state
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, assistantMessage],
        isStreaming: true,
        error: null,
        currentStreamingMessage: '',
      }))

      try {
        // Create abort controller for this request
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        // Build conversation history
        const conversationHistory = state.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        // Send streaming request
        const response = await fetch('/api/chat-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            files,
            searchContext,
            voiceMode,
            conversationHistory,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        // Process streaming response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: StreamResponse = JSON.parse(line.slice(6))

                switch (data.type) {
                  case 'content':
                    // Update streaming message content
                    setState((prev) => ({
                      ...prev,
                      currentStreamingMessage: data.fullResponse || '',
                      messages: prev.messages.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: data.fullResponse || '' }
                          : msg
                      ),
                    }))
                    break

                  case 'audio':
                    // Add audio URL to the assistant message
                    if (data.audio) {
                      setState((prev) => ({
                        ...prev,
                        messages: prev.messages.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, audioUrl: data.audio?.url }
                            : msg
                        ),
                      }))
                    }
                    break

                  case 'complete':
                    // Mark streaming as complete
                    setState((prev) => ({
                      ...prev,
                      isStreaming: false,
                      currentStreamingMessage: '',
                      messages: prev.messages.map((msg) =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              content: data.fullResponse || '',
                              isStreaming: false,
                            }
                          : msg
                      ),
                    }))
                    break

                  case 'error':
                    throw new Error(data.error || 'Streaming error')
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError)
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was aborted, don't show error
          return
        }

        console.error('Streaming chat error:', error)

        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Failed to send message',
          currentStreamingMessage: '',
          messages: prev.messages.filter((msg) => msg.id !== assistantMessageId),
        }))
      } finally {
        abortControllerRef.current = null
      }
    },
    [state.messages]
  )

  const clearChat = useCallback(() => {
    // Stop any current streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      messages: [],
      isStreaming: false,
      error: null,
      currentStreamingMessage: '',
    })
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState((prev) => ({
      ...prev,
      isStreaming: false,
      currentStreamingMessage: '',
      messages: prev.messages.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      ),
    }))
  }, [])

  return {
    state,
    sendMessage,
    clearChat,
    stopStreaming,
  }
}
