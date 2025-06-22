import { useChat } from '@ai-sdk/react'
import { Eraser, Globe, Loader2, Mic, Paperclip, Send, StopCircle, Volume2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMatches, useNavigate, useParams, type LoaderFunctionArgs } from 'react-router'
import { AttachmentsPreview } from '~/components/chat/AttachmentsPreview.js'
import { AudioRecorder } from '~/components/chat/AudioRecorder.js'
import { ChatMessage } from '~/components/chat/ChatMessage.js'
import { FileUploader } from '~/components/chat/FileUploader.js'
import { SearchContextPreview } from '~/components/chat/SearchContextPreview.js'
import { performWebSearch } from '~/components/chat/utils.js'
import { Button } from '~/components/ui/button.js'
import { useChat as useChatPersistence, useChats } from '~/lib/hooks/use-chat-persistence.js'
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
  const [inputValue, setInputValue] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<ChatFileAttachment[]>([])
  const [searchContext, setSearchContext] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update currentChatId when chatId prop changes
  useEffect(() => {
    setCurrentChatId(chatId || null)
  }, [chatId])

  // Load existing chat if chatId is provided
  const { chat, isLoading: isLoadingChat } = useChatPersistence(currentChatId)

  // Hook for managing chats (creating new ones)
  const { createChat } = useChats(userId)

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
    isLoading,
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

  const { state: ttsState, speak, stop: stopTTS } = useTextToSpeech()

  const characterCount = inputValue.length
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const trimmedValue = inputValue.trim()
  const canSubmit = (trimmedValue || attachedFiles.length > 0) && !isLoading && !isOverLimit

  // Auto-speak responses in voice mode
  useEffect(() => {
    if (isVoiceMode && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && lastMessage.content && !isLoading) {
        speak(lastMessage.content, 'alloy', 1.0)
      }
    }
  }, [messages, isVoiceMode, isLoading, speak])

  // Handle input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (value.length <= MAX_MESSAGE_LENGTH) {
        setInputValue(value)
        setInput(value)
      }
    },
    [setInput]
  )

  // Helper function to generate chat title from message
  const generateChatTitle = useCallback((message: string): string => {
    // Take first 50 characters and clean it up
    const title = message.slice(0, 50).trim()
    if (title.length === 50 && message.length > 50) {
      return `${title}...`
    }
    return title || 'New Chat'
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    const messageContent = trimmedValue
    if (!messageContent && attachedFiles.length === 0) return

    try {
      let activeChatId = currentChatId

      // If no chat exists, create a new one
      if (!activeChatId && messageContent) {
        const title = generateChatTitle(messageContent)

        // Create new chat
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            title,
            userId,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          activeChatId = result.chat?.id
          setCurrentChatId(activeChatId)

          // Navigate to the new chat URL
          if (activeChatId) {
            navigate(`/chat/${activeChatId}`, { replace: true })
          }
        }
      }

      // Set the input content first
      setInput(messageContent)

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
      setInputValue('')
      setAttachedFiles([])
      setSearchContext('')
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
    setInputValue('')
    setAttachedFiles([])
    setSearchContext('')
  }, [setMessages])

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
    setAttachedFiles((prev) => [...prev, ...convertedFiles])
    setShowFileUploader(false)
  }, [])

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }, [])

  // Handle remove all files
  const handleRemoveAllFiles = useCallback(() => {
    setAttachedFiles([])
  }, [])

  // Handle audio recording
  const handleAudioRecorded = useCallback(
    (audioBlob: Blob, transcript?: string) => {
      if (transcript) {
        setInputValue(transcript)
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Display */}
        {chatError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="text-sm font-medium text-destructive mb-1">Chat Error</div>
            <div className="text-xs text-destructive/80">{chatError.message}</div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && (
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
      <div className="fixed w-full max-w-3xl bottom-10 border rounded-4xl backdrop-blur-lg p-4 space-y-2">
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
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full resize-none rounded-lg border border-border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ring"
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
          <div className="flex gap-2">
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
