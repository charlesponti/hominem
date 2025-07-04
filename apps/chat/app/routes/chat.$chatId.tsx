import { useChat } from '@ai-sdk/react'
import { Eraser, Globe, Loader2, Mic, Paperclip, Send, StopCircle, Volume2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMatches, useNavigate } from 'react-router'
import { AttachmentsPreview } from '~/components/chat/AttachmentsPreview.js'
import { AudioRecorder } from '~/components/chat/AudioRecorder.js'
import { ChatMessage } from '~/components/chat/ChatMessage.js'
import { FileUploader } from '~/components/chat/FileUploader.js'
import { SearchContextPreview } from '~/components/chat/SearchContextPreview.js'
import { performWebSearch } from '~/components/chat/utils.js'
import { Button } from '~/components/ui/button.js'
import {
  useChat as useChatPersistence,
  useChats,
  useCreateChat,
} from '~/lib/hooks/use-chat-persistence.js'
import { useTextToSpeech } from '~/lib/hooks/use-text-to-speech.js'
import type { ChatFileAttachment } from '~/lib/types/chat.js'
import type { UploadedFile } from '~/lib/types/upload.js'
import type { Route } from './+types/chat.$chatId'

const MAX_MESSAGE_LENGTH = 10000

export default function UnifiedChatInterface({ params }: Route.ComponentProps) {
  const navigate = useNavigate()
  const { chatId } = params
  const matches = useMatches()

  // Get userId from root loader data
  const rootData = matches.find((match) => match.id === 'root')?.data as
    | { hominemUserId: string | null }
    | undefined
  const userId = rootData?.hominemUserId

  if (!userId) {
    // This shouldn't happen since root loader handles auth, but just in case
    throw new Error('User not authenticated')
  }
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<ChatFileAttachment[]>([])
  const [searchContext, setSearchContext] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)

  // Update currentChatId when chatId prop changes
  useEffect(() => {
    setCurrentChatId(chatId || null)
  }, [chatId])

  // Load existing chat if chatId is provided
  const { chat, isLoading: isLoadingChat, refetch: refetchChat } = useChatPersistence(currentChatId)

  // Hook for managing chats (creating new ones)
  const { createChat } = useCreateChat(userId)

  // Convert chat messages to AI SDK format
  const initialMessages =
    chat?.messages?.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      createdAt: new Date(msg.createdAt),
    })) || []

  // Use AI SDK hook with full features
  const {
    messages,
    input,
    setInput,
    handleInputChange: aiHandleInputChange,
    handleSubmit: aiHandleSubmit,
    status,
    stop,
    setMessages,
    error: chatError,
  } = useChat({
    api: '/api/chat-stream',
    maxSteps: 5,
    initialMessages,
    onError: (error: Error) => {
      console.error('Chat interface error:', error)
      console.error('Error occurred at:', new Date().toISOString())
    },
    onFinish: async (message) => {
      // Refetch chat data after AI response is complete to get the saved message
      if (currentChatId && message.role === 'assistant') {
        try {
          await refetchChat()
        } catch (error) {
          console.warn('Failed to refetch chat after AI response:', error)
        }
      }
    },
  })

  // Update messages when chat loads
  useEffect(() => {
    if (chat?.messages && !isLoadingChat) {
      const formattedMessages = chat.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      }))
      setMessages(formattedMessages)
    }
  }, [chat, isLoadingChat, setMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const currentMessageCount = messages.length
    const previousMessageCount = previousMessageCountRef.current

    // Only scroll if we have new messages or if we're streaming
    if (currentMessageCount > previousMessageCount || status === 'streaming') {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current
        const scrollToBottom = () => {
          container.scrollTop = container.scrollHeight
        }

        // Scroll immediately
        scrollToBottom()

        // Also scroll after a small delay to handle any dynamic content rendering
        const timeoutId = setTimeout(scrollToBottom, 100)

        return () => clearTimeout(timeoutId)
      }
    }

    // Update the ref with current count
    previousMessageCountRef.current = currentMessageCount
  }, [messages.length, status])

  // Auto-scroll during streaming with a more frequent interval
  useEffect(() => {
    if (status === 'streaming' && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const intervalId = setInterval(() => {
        container.scrollTop = container.scrollHeight
      }, 100) // Scroll every 100ms during streaming

      return () => clearInterval(intervalId)
    }
  }, [status])

  const { state: ttsState, speak, stop: stopTTS } = useTextToSpeech()

  const characterCount = input.length
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const trimmedValue = input.trim()
  const isLoading = status === 'streaming' || status === 'submitted'
  const canSubmit = (trimmedValue || attachedFiles.length > 0) && !isLoading && !isOverLimit

  // Check if there's a streaming message (last message is assistant and streaming)
  const hasStreamingMessage =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    status === 'streaming'

  // Show thinking component only when submitted but no streaming message yet
  const showThinkingComponent =
    status === 'submitted' || (status === 'streaming' && !hasStreamingMessage)

  // Auto-speak responses in voice mode
  useEffect(() => {
    if (isVoiceMode && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.content && !isLoading) {
        speak(lastMessage.content, 'alloy', 1.0)
      }
    }
  }, [messages, isVoiceMode, isLoading, speak])

  // Helper function to generate chat title from message
  const generateChatTitle = useCallback((message: string): string => {
    // Take first 50 characters and clean it up
    const title = message.slice(0, 50).trim()
    if (title.length === 50 && message.length > 50) {
      return `${title}...`
    }
    return title || 'New Chat'
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    try {
      let activeChatId = currentChatId

      // If no chat exists, create a new one
      if (!activeChatId && trimmedValue) {
        const title = generateChatTitle(trimmedValue)

        // Create new chat using the hook
        try {
          const result = await createChat({ title, userId })
          activeChatId = result.chat?.id
          setCurrentChatId(activeChatId)

          // Navigate to the new chat URL
          if (activeChatId) {
            navigate(`/chat/${activeChatId}`, { replace: true })
          }
        } catch (error) {
          console.error('Failed to create chat:', error)
          // Continue with the message even if chat creation fails
        }
      }

      // Set the input content first
      setInput(trimmedValue)

      // Submit using the AI SDK format
      aiHandleSubmit(undefined, {
        body: {
          files: attachedFiles,
          searchContext,
          voiceMode: isVoiceMode,
          chatId: activeChatId,
          userId,
        },
      })

      // Clear form
      setAttachedFiles([])
      setSearchContext('')

      // Refetch chat data after a short delay to ensure the user message is saved
      if (activeChatId) {
        setTimeout(() => {
          refetchChat().catch((error) => {
            console.warn('Failed to refetch chat after user message:', error)
          })
        }, 100)
      }
    } catch (error) {
      console.error('Submit error:', error)
    }
  }, [
    canSubmit,
    trimmedValue,
    attachedFiles,
    searchContext,
    isVoiceMode,
    setInput,
    aiHandleSubmit,
    currentChatId,
    userId,
    navigate,
    generateChatTitle,
    refetchChat,
    createChat,
  ])

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSubmit) {
          handleSubmit()
        }
      }
    },
    [canSubmit, handleSubmit]
  )

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([])
    setInput('')
    setAttachedFiles([])
    setSearchContext('')
  }, [setMessages, setInput])

  // Handle file uploads - convert from API response to chat attachment format
  const handleFilesUploaded = useCallback((uploadedFiles: UploadedFile[]) => {
    const convertedFiles: ChatFileAttachment[] = uploadedFiles.map((file) => ({
      id: file.id,
      name: file.originalName,
      type: file.mimetype,
      size: file.size,
      isUploading: false,
      uploadProgress: 100,
    }))
    setAttachedFiles((prev: ChatFileAttachment[]) => [...prev, ...convertedFiles])
    setShowFileUploader(false)
  }, [])

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev: ChatFileAttachment[]) =>
      prev.filter((file: ChatFileAttachment) => file.id !== fileId)
    )
  }, [])

  // Handle remove all files
  const handleRemoveAllFiles = useCallback(() => {
    setAttachedFiles([])
  }, [])

  // Handle audio recording
  const handleAudioRecorded = useCallback(
    (audioBlob: Blob, transcript?: string) => {
      if (transcript) {
        setInput(transcript)
      }
      setShowAudioRecorder(false)
    },
    [setInput]
  )

  // Handle web search
  const handleWebSearch = useCallback(async () => {
    if (!trimmedValue) return

    setIsSearching(true)
    try {
      const results = await performWebSearch(trimmedValue)
      if (results.success && results.context) {
        setSearchContext(results.context)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [trimmedValue])

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-background text-foreground">
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Display */}
        {chatError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="text-sm font-medium text-destructive mb-1">Chat Error</div>
            <div className="text-xs text-destructive/80">{chatError.message}</div>
          </div>
        )}

        {messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            isStreaming={
              status === 'streaming' &&
              index === messages.length - 1 &&
              message.role === 'assistant'
            }
          />
        ))}

        {showThinkingComponent && (
          <div className="bg-muted mr-12 p-4 rounded-lg">
            <div className="text-sm opacity-70 mb-2">AI Assistant</div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4 space-y-2 pb-safe">
        {/* Attachments Preview */}
        {attachedFiles.length > 0 && (
          <AttachmentsPreview
            files={attachedFiles}
            onRemoveFile={handleRemoveFile}
            onRemoveAll={handleRemoveAllFiles}
          />
        )}

        {/* Search Context Preview */}
        {searchContext && (
          <SearchContextPreview
            searchContext={searchContext}
            onRemove={() => setSearchContext('')}
          />
        )}

        {/* Input Form */}
        <div className="flex gap-2">
          {isOverLimit ? (
            <div className="text-xs text-muted-foreground">
              <span className="text-destructive">Message too long</span>
            </div>
          ) : null}

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={aiHandleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full resize-none rounded-lg border border-border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '200px',
                height: 'auto',
              }}
              disabled={isLoading}
            />

            {/* Character count */}
            <div className="absolute bottom-3 right-2 text-xs text-muted-foreground/50">
              {characterCount}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>
        </div>

        {/* Chat Controls */}
        <div className="flex items-center justify-between">
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* Web Search */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleWebSearch}
              disabled={!trimmedValue || isSearching}
              title="Search the web"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </Button>

            {/* File Upload */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFileUploader(true)}
              disabled={isLoading}
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Voice Mode */}
            <Button
              variant={isVoiceMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              title="Toggle voice mode"
            >
              <Volume2 className="w-4 h-4" />
            </Button>

            {/* Audio Recording */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAudioRecorder(true)}
              disabled={isLoading}
              title="Record audio"
            >
              <Mic className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Eraser className="h-3 w-3 mr-1" />
            </Button>
          </div>

          <div>
            {/* Submit/Stop Button */}
            {isLoading ? (
              <Button variant="destructive" size="sm" onClick={stop} title="Stop generation">
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isOverLimit}
                size="sm"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFileUploader && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Files</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFileUploader(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <FileUploader onFilesUploaded={handleFilesUploaded} maxFiles={5} />
          </div>
        </div>
      )}

      {showAudioRecorder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Record Audio</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAudioRecorder(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <AudioRecorder onRecordingComplete={handleAudioRecorded} />
          </div>
        </div>
      )}
    </div>
  )
}
