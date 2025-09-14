import { LoaderCircle, Mic, Paperclip, Send, Zap } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useMatches } from 'react-router'
import { Button } from '~/components/ui/button.js'
import { useFileUpload } from '~/lib/hooks/use-file-upload.js'
import { useSendMessage } from '~/lib/hooks/use-send-message.js'
import { useSendMessageStreaming } from '~/lib/hooks/use-send-message-streaming.js'
import { ChatModals } from './ChatModals.js'

const MAX_MESSAGE_LENGTH = 10000

interface ChatInputStreamingProps {
  chatId: string
  onStatusChange?: (
    status: 'idle' | 'submitted' | 'streaming' | 'error',
    error?: Error | null
  ) => void
}

export function ChatInputStreaming({ chatId, onStatusChange }: ChatInputStreamingProps) {
  const [inputValue, setInputValue] = useState('')
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true) // Default to streaming
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get userId from root loader data
  const matches = useMatches()
  const rootData = matches.find((match) => match.id === 'root')?.data as
    | { supabaseId: string | null }
    | undefined
  const userId = rootData?.supabaseId || undefined

  const sendMessage = useSendMessage({ chatId, userId })
  const sendMessageStreaming = useSendMessageStreaming({ chatId, userId })
  const { uploadState, uploadFiles, removeFile, clearAll } = useFileUpload()

  // Use the appropriate mutation based on streaming preference
  const activeMutation = useStreaming ? sendMessageStreaming : sendMessage
  const isSubmitting = activeMutation.isPending

  const characterCount = inputValue.length
  const hasInput = inputValue.trim().length > 0
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const canSubmit = hasInput && !isOverLimit

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!canSubmit && uploadState.uploadedFiles.length === 0) return

    const trimmedValue = inputValue.trim()
    try {
      onStatusChange?.(useStreaming ? 'streaming' : 'submitted')
      setInputValue('') // Clear input immediately for better UX
      clearAll()

      await activeMutation.mutateAsync({
        message: trimmedValue,
        chatId,
      })

      onStatusChange?.('idle')
    } catch (error) {
      console.error('Failed to send message:', error)
      onStatusChange?.('error', error as Error)
      // Could add error handling UI here
    }
  }, [
    canSubmit,
    inputValue,
    activeMutation,
    uploadState.uploadedFiles,
    clearAll,
    chatId,
    onStatusChange,
    useStreaming,
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSubmit || uploadState.uploadedFiles.length > 0) {
          handleSubmit()
        }
      }
    },
    [canSubmit, handleSubmit, uploadState.uploadedFiles.length]
  )

  const handleFileUpload = useCallback(() => {
    setShowFileUploader(true)
  }, [])

  const handleAudioRecord = useCallback(() => {
    setShowAudioRecorder(true)
  }, [])

  const handleFilesUploaded = useCallback((files: any[]) => {
    // Files are already uploaded by the FileUploader component
    // The useFileUpload hook manages the state internally
  }, [])

  const handleAudioRecorded = useCallback(
    async (audioBlob: Blob, transcript?: string) => {
      setShowAudioRecorder(false)

      if (transcript?.trim()) {
        try {
          onStatusChange?.(useStreaming ? 'streaming' : 'submitted')
          await activeMutation.mutateAsync({
            message: transcript.trim(),
            chatId,
          })
          onStatusChange?.('idle')
        } catch (error) {
          console.error('Failed to send transcribed message:', error)
          onStatusChange?.('error', error as Error)
        }
      }
    },
    [activeMutation, chatId, onStatusChange, useStreaming]
  )

  const toggleStreaming = useCallback(() => {
    setUseStreaming(!useStreaming)
  }, [useStreaming])

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Error message */}
        {isOverLimit ? (
          <div className="text-xs text-muted-foreground">
            <span className="text-destructive">Message too long</span>
          </div>
        ) : null}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full resize-none rounded-lg border border-border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
              rows={1}
              disabled={isSubmitting}
            />

            <div className="absolute bottom-3 right-2 text-xs text-muted-foreground/50">
              {characterCount}/{MAX_MESSAGE_LENGTH}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit && uploadState.uploadedFiles.length === 0}
            size="sm"
            title="Send message"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Streaming Toggle */}
          <Button
            variant={useStreaming ? 'default' : 'outline'}
            size="sm"
            onClick={toggleStreaming}
            disabled={isSubmitting}
            title={useStreaming ? 'Disable streaming' : 'Enable streaming'}
            className="flex items-center gap-2"
          >
            <Zap className="size-4" />
            <span className="text-xs">{useStreaming ? 'Streaming' : 'Regular'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFileUpload}
            disabled={isSubmitting}
            title="Attach files"
          >
            <Paperclip className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAudioRecord}
            disabled={isSubmitting}
            title="Record audio"
          >
            <Mic className="size-4" />
          </Button>
        </div>
      </div>

      {/* File Upload and Audio Recording Modals */}
      <ChatModals
        showFileUploader={showFileUploader}
        showAudioRecorder={showAudioRecorder}
        onCloseFileUploader={() => setShowFileUploader(false)}
        onCloseAudioRecorder={() => setShowAudioRecorder(false)}
        onFilesUploaded={handleFilesUploaded}
        onAudioRecorded={handleAudioRecorded}
      />
    </>
  )
}
