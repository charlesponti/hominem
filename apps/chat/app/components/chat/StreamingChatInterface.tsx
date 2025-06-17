import { Globe, Loader2, Mic, Paperclip, Send, StopCircle, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '~/components/ui/button.js'
import { useStreamingChat } from '~/lib/hooks/use-streaming-chat.js'
import { useTextToSpeech } from '~/lib/hooks/use-text-to-speech.js'
import type { ProcessedFile } from '~/lib/services/file-processor.server.js'
import { AttachmentsPreview } from './AttachmentsPreview.js'
import { AudioRecorder } from './AudioRecorder.js'
import { ChatControls } from './ChatControls.js'
import { FileUploader } from './FileUploader.js'
import { MessagesList } from './MessagesList.js'
import { SearchContextPreview } from './SearchContextPreview.js'
import { performWebSearch } from './utils.js'

const MAX_MESSAGE_LENGTH = 10000

export function StreamingChatInterface() {
  const [inputValue, setInputValue] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([])
  const [searchContext, setSearchContext] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { state, sendMessage, clearChat, stopStreaming } = useStreamingChat()
  const { state: ttsState, speak, stop: stopTTS } = useTextToSpeech()

  const characterCount = inputValue.length
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const trimmedValue = inputValue.trim()
  const canSubmit = (trimmedValue || attachedFiles.length > 0) && !state.isStreaming && !isOverLimit

  // Auto-speak responses in voice mode
  useEffect(() => {
    if (isVoiceMode && state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1]

      if (lastMessage.role === 'assistant' && lastMessage.content && !lastMessage.isStreaming) {
        if (lastMessage.audioUrl) {
          // If we have pre-generated audio, use that
          const audio = new Audio(lastMessage.audioUrl)
          audio.play().catch(console.error)
        } else {
          // Fallback to client-side TTS
          speak(lastMessage.content, 'alloy', 1.0)
        }
      }
    }
  }, [state.messages, isVoiceMode, speak])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (canSubmit) {
          handleSubmit()
        }
      }
    },
    [canSubmit]
  )

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    const messageContent = trimmedValue || 'Attached files'
    const filesToSend = [...attachedFiles]
    const searchContextToSend = searchContext

    // Clear input and attachments
    setInputValue('')
    setAttachedFiles([])
    setSearchContext('')
    setShowFileUploader(false)
    setShowAudioRecorder(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await sendMessage(messageContent, filesToSend, searchContextToSend, isVoiceMode)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [canSubmit, trimmedValue, attachedFiles, searchContext, isVoiceMode, sendMessage])

  const handleWebSearch = useCallback(async () => {
    if (!trimmedValue) {
      // Just toggle the search indicator
      const searchText = '[Web Search] '
      setInputValue((prev) => {
        if (prev.startsWith(searchText)) {
          return prev.slice(searchText.length)
        }
        return searchText + prev
      })
      return
    }

    setIsSearching(true)
    try {
      const searchResult = await performWebSearch(trimmedValue)

      if (searchResult.success && searchResult.context) {
        setSearchContext(searchResult.context)
        setInputValue((prev) => `[Web Search] ${prev}`)
      } else {
        console.error('Search failed:', searchResult.error)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [trimmedValue])

  const handleAttachment = useCallback(() => {
    setShowFileUploader(!showFileUploader)
  }, [showFileUploader])

  const handleMicrophone = useCallback(() => {
    setShowAudioRecorder(!showAudioRecorder)
  }, [showAudioRecorder])

  const handleVoiceMode = useCallback(() => {
    const newVoiceMode = !isVoiceMode
    setIsVoiceMode(newVoiceMode)

    if (!newVoiceMode) {
      stopTTS()
    }
  }, [isVoiceMode, stopTTS])

  const handleFilesUploaded = useCallback((files: ProcessedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files])
  }, [])

  const handleAudioRecordingComplete = useCallback((audioBlob: Blob, transcription?: string) => {
    if (transcription) {
      setInputValue((prev) => prev + (prev ? ' ' : '') + transcription)
    }

    const processedAudio: ProcessedFile = {
      id: `audio-${Date.now()}`,
      originalName: `recording-${Date.now()}.webm`,
      type: 'audio',
      mimetype: 'audio/webm',
      size: audioBlob.size,
      textContent: transcription || '',
      metadata: { isRecording: true, transcription: transcription || '' },
    }

    setAttachedFiles((prev) => [...prev, processedAudio])
    setShowAudioRecorder(false)

    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleTranscription = useCallback((text: string) => {
    setInputValue((prev) => prev + (prev ? ' ' : '') + text)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col touch-manipulation bg-background">
      <MessagesList
        messages={state.messages}
        currentStreamingMessage={state.currentStreamingMessage}
        error={state.error}
        onRetry={() => window.location.reload()}
      />

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-sm border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* File Uploader */}
          {showFileUploader && (
            <div className="mb-4">
              <FileUploader
                onFilesUploaded={handleFilesUploaded}
                maxFiles={5}
                className="bg-background/95 backdrop-blur-sm border rounded-lg p-4"
              />
            </div>
          )}

          {/* Audio Recorder */}
          {showAudioRecorder && (
            <div className="mb-4">
              <AudioRecorder
                onRecordingComplete={handleAudioRecordingComplete}
                onTranscription={handleTranscription}
                autoTranscribe={true}
                showPlayer={true}
                className="bg-background/95 backdrop-blur-sm border rounded-lg p-4"
              />
            </div>
          )}

          <AttachmentsPreview
            files={attachedFiles}
            onRemoveFile={(fileId) =>
              setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId))
            }
            onRemoveAll={() => setAttachedFiles([])}
          />

          <SearchContextPreview
            searchContext={searchContext}
            onRemove={() => setSearchContext('')}
          />

          {/* Input Form */}
          <div className="flex items-end gap-2 w-full bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
            {/* Left side icons */}
            <div className="flex gap-1 pb-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleAttachment}
                className={`h-[32px] w-[32px] shrink-0 ${
                  showFileUploader || attachedFiles.length > 0
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleWebSearch}
                disabled={isSearching}
                className={`h-[32px] w-[32px] shrink-0 ${
                  searchContext || inputValue.startsWith('[Web Search]')
                    ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Web search"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Input field */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                disabled={state.isStreaming}
                className="w-full resize-none rounded-md px-3 py-2 text-sm sm:text-base focus-visible:outline-none bg-transparent min-h-[44px] max-h-[200px] touch-manipulation disabled:opacity-50"
                style={{
                  height: 'auto',
                  WebkitAppearance: 'none',
                  fontSize: '16px',
                }}
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck="true"
              />

              {/* Character counter */}
              {characterCount > MAX_MESSAGE_LENGTH * 0.8 && (
                <div
                  className={`absolute bottom-1 right-2 text-xs ${
                    isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {characterCount}/{MAX_MESSAGE_LENGTH}
                </div>
              )}
            </div>

            {/* Right side icons */}
            <div className="flex gap-1 pb-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleMicrophone}
                className={`h-[32px] w-[32px] shrink-0 ${
                  showAudioRecorder
                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={showAudioRecorder ? 'Close voice recorder' : 'Open voice recorder'}
              >
                <Mic className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceMode}
                className={`h-[32px] w-[32px] shrink-0 ${
                  isVoiceMode
                    ? ttsState.isSpeaking
                      ? 'text-green-500 bg-green-50 hover:bg-green-100 animate-pulse'
                      : 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={
                  isVoiceMode
                    ? ttsState.isSpeaking
                      ? 'Speaking... (Click to disable voice mode)'
                      : 'Voice mode enabled (Click to disable)'
                    : 'Enable voice mode'
                }
              >
                <Volume2 className="h-4 w-4" />
              </Button>

              {/* Send or Stop button */}
              {state.isStreaming ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={stopStreaming}
                  className="h-[32px] w-[32px] shrink-0"
                  title="Stop generation"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  size="icon"
                  disabled={!canSubmit}
                  className="h-[32px] w-[32px] shrink-0"
                  title={
                    isOverLimit
                      ? 'Message too long'
                      : !trimmedValue && attachedFiles.length === 0
                        ? 'Enter a message or attach files'
                        : 'Send message'
                  }
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <ChatControls onClearChat={clearChat} disabled={state.isStreaming} />
        </div>
      </div>
    </div>
  )
}
