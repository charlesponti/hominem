import { Eraser, Mic, Paperclip, Send, StopCircle, Volume2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '~/components/ui/button.js'
import { useFileUpload } from '~/lib/hooks/use-file-upload.js'
import { useSendMessage } from '~/lib/hooks/use-send-message.js'
import { ChatModals } from './ChatModals.js'

const MAX_MESSAGE_LENGTH = 10000

interface ChatInputProps {
  chatId: string
  userId: string
  onStop: () => void
  isLoading: boolean
  onAudioRecord: () => void
  onClearChat: () => void
  isSearching: boolean
  initialValue?: string
}

export function ChatInput({
  chatId,
  userId,
  onStop,
  isLoading,
  onAudioRecord,
  onClearChat,
  isSearching,
  initialValue = '',
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState(initialValue)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { sendMessage, isSending } = useSendMessage({ chatId, userId })
  const { uploadState, uploadFiles, removeFile, clearAll } = useFileUpload()

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
      await sendMessage(trimmedValue, {
        files: uploadState.uploadedFiles.map((f) => ({
          type: f.type as 'image' | 'file',
          filename: f.originalName,
          mimeType: f.mimetype,
          size: f.size,
        })),
      })
      setInputValue('')
      clearAll()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Could add error handling UI here
    }
  }, [canSubmit, inputValue, sendMessage, uploadState.uploadedFiles, clearAll])

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

  const handleToggleVoiceMode = useCallback(() => {
    setIsVoiceMode(!isVoiceMode)
  }, [isVoiceMode])

  const handleClearChat = useCallback(() => {
    setInputValue('')
    clearAll()
    onClearChat()
  }, [clearAll, onClearChat])

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

  const handleAudioRecorded = useCallback((audioBlob: Blob, transcript?: string) => {
    setShowAudioRecorder(false)
  }, [])

  const isSubmitting = isLoading || isSending

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

          {isSubmitting ? (
            <Button variant="destructive" size="sm" onClick={onStop} title="Stop generation">
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit && uploadState.uploadedFiles.length === 0}
              size="sm"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFileUpload}
            disabled={isSubmitting}
            title="Attach files"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Button
            variant={isVoiceMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleVoiceMode}
            title="Toggle voice mode"
          >
            <Volume2 className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAudioRecord}
            disabled={isSubmitting}
            title="Record audio"
          >
            <Mic className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Eraser className="h-3 w-3 mr-1" />
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
