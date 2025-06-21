/// <reference lib="dom" />
import type { ChatMessageSelect } from '@hominem/utils/types'
import { Eraser, Globe, Mic, NotebookPen, Paperclip, Send, Volume2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioRecorder } from '~/components/chat/AudioRecorder.js'
import { FileUploader } from '~/components/chat/FileUploader.js'
import { Button } from '~/components/ui/button.js'
import { useTextToSpeech } from '~/lib/hooks/use-text-to-speech.js'
import type { ProcessedFile } from '~/lib/services/file-processor.server.js'
import { VirtualizedMessageList } from './VirtualizedMessageList.js'

// Speech Recognition API types
declare global {
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string
    readonly message: string
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number
    readonly results: SpeechRecognitionResultList
  }

  interface SpeechGrammarList {
    readonly length: number
    item(index: number): SpeechGrammar
    addFromString(string: string, weight?: number): void
    addFromURI(src: string, weight?: number): void
  }

  interface SpeechGrammar {
    src: string
    weight: number
  }

  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
  }

  interface SpeechRecognitionResult {
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    readonly isFinal: boolean
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }

  interface SpeechRecognitionStatic {
    new (): SpeechRecognition
  }

  interface SpeechRecognition extends EventTarget {
    grammars: SpeechGrammarList
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    serviceURI: string // Optional: some browsers might not have this
    start(): void
    stop(): void
    abort(): void
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null
    onend: ((this: SpeechRecognition, ev: Event) => any) | null
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  }

  interface Window {
    SpeechRecognition: SpeechRecognitionStatic
    webkitSpeechRecognition: SpeechRecognitionStatic
  }
}

const MAX_MESSAGE_LENGTH = 10000

type ChatInterfaceProps = {
  messages: ChatMessageSelect[]
  onSendMessage: (message: string, files?: ProcessedFile[]) => void
  isSending: boolean
  error: boolean
  onReset: () => void
  onNewChat?: () => void
  hasMore?: boolean
  isFetchingMore?: boolean
  fetchMore?: () => void
}

export function ChatInterface({
  messages,
  onSendMessage,
  isSending,
  error, // This error prop is for send errors, VirtualizedMessageList will handle its own display for this
  onReset,
  onNewChat,
  hasMore = false,
  isFetchingMore = false,
  fetchMore,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLFormElement>(null) // For the form, still relevant
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Text-to-speech for voice mode
  const { state: ttsState, speak, stop: stopTTS } = useTextToSpeech()

  const characterCount = inputValue.length
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH
  const trimmedValue = inputValue.trim()
  const canSubmit = (trimmedValue || attachedFiles.length > 0) && !isSending && !isOverLimit

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const shouldSubmit = e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)

      if (shouldSubmit) {
        e.preventDefault()
        const currentTrimmedValue = inputValue.trim() // Use a local variable for the current trimmed value
        if (!currentTrimmedValue || currentTrimmedValue.length > MAX_MESSAGE_LENGTH || isSending) {
          if (currentTrimmedValue.length > MAX_MESSAGE_LENGTH) {
            console.warn('Message too long (max 10,000 characters)')
          }
          return
        }
        onSendMessage(currentTrimmedValue)
        setInputValue('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
    },
    [inputValue, isSending, onSendMessage] // Dependencies are correct
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const currentTrimmedValue = inputValue.trim() // Use a local variable
      if (
        (!currentTrimmedValue && attachedFiles.length === 0) ||
        currentTrimmedValue.length > MAX_MESSAGE_LENGTH ||
        isSending
      ) {
        if (currentTrimmedValue.length > MAX_MESSAGE_LENGTH) {
          console.warn('Message too long (max 10,000 characters)')
        }
        return
      }
      onSendMessage(currentTrimmedValue || 'Attached files', attachedFiles)
      setInputValue('')
      setAttachedFiles([])
      setShowFileUploader(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    },
    [inputValue, attachedFiles, isSending, onSendMessage] // Dependencies are correct
  )

  const handleAttachment = useCallback(() => {
    setShowFileUploader(!showFileUploader)
  }, [showFileUploader])

  const handleFilesUploaded = useCallback((files: ProcessedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files])
  }, [])

  const handleWebSearch = useCallback(() => {
    // Add web search indicator to the input
    const searchText = '[Web Search] '
    setInputValue((prev) => {
      // Don't add if already present
      if (prev.startsWith(searchText)) {
        return prev
      }
      return searchText + prev
    })

    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }

    // TODO: Implement actual web search API integration
  }, [])

  const handleMicrophone = useCallback(() => {
    setShowAudioRecorder(!showAudioRecorder)
  }, [showAudioRecorder])

  const handleAudioRecordingComplete = useCallback((audioBlob: Blob, transcription?: string) => {
    // If we have transcription, add it to the input
    if (transcription) {
      setInputValue((prev) => prev + (prev ? ' ' : '') + transcription)
    }

    // Create a file from the audio blob and add it to attached files
    const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
      type: 'audio/webm',
    })

    // Create a processed file entry for the audio
    const processedAudio: ProcessedFile = {
      id: `audio-${Date.now()}`,
      originalName: audioFile.name,
      type: 'audio',
      mimetype: audioFile.type,
      size: audioFile.size,
      textContent: transcription || '',
      metadata: {
        isRecording: true,
        transcription: transcription || '',
      },
    }

    setAttachedFiles((prev) => [...prev, processedAudio])
    setShowAudioRecorder(false)

    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleTranscription = useCallback((text: string) => {
    // Auto-fill the input with transcribed text
    setInputValue((prev) => prev + (prev ? ' ' : '') + text)
  }, [])

  const handleVoiceMode = useCallback(() => {
    const newVoiceMode = !isVoiceMode
    setIsVoiceMode(newVoiceMode)

    // !TODO Implement this
    if (!newVoiceMode) {
      // Stop any ongoing TTS
      stopTTS()
    }
  }, [isVoiceMode, stopTTS])

  // Auto-speak new AI messages when voice mode is enabled
  useEffect(() => {
    if (isVoiceMode && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]

      // Only speak AI messages (not user messages)
      // Based on ChatMessageSelect, lastMessage.content is a string.
      if (lastMessage.role === 'assistant' && typeof lastMessage.content === 'string') {
        const textContent = lastMessage.content

        if (textContent.trim()) {
          speak(textContent, 'alloy', 1.0)
        }
      }
    }
  }, [messages, isVoiceMode, speak])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  return (
    <div ref={chatContainerRef} className="fixed inset-0 flex flex-col touch-manipulation">
      {/* VirtualizedMessageList handles its own scrolling and message rendering */}
      <VirtualizedMessageList
        messages={messages}
        isSending={isSending} // Pass isSending for potential display within the list
        error={error} // Pass error for potential display within the list
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}
        fetchMore={fetchMore}
      />

      {/* Form container - fixed at bottom */}
      {/* The error display related to sending messages might be better placed near the input or as a toast,
          but for now, VirtualizedMessageList also receives `error` and `isSending` to display indicators.
          If a global toast system is preferred, that would be another refactor.
      */}
      {/* The specific error display for *sending* could remain here or be a global toast.
          The `error` prop passed to VirtualizedMessageList is for it to potentially show an error
          if it's directly related to list operations or if we want a unified error display area.
          For now, let's assume the error prop passed to VirtualizedMessageList is for its internal error display.
          The form-specific error (e.g. "Failed to send") can be handled here if needed, or via global notifications.
          The existing error display logic was moved to VirtualizedMessageList.
      */}

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-sm border-t">
        <div className="mx-auto max-w-[850px] px-2 sm:px-4 py-2 sm:py-4 pb-safe">
          {/* File Uploader - shown when attachment button is clicked */}
          {showFileUploader && (
            <div className="mb-4">
              <FileUploader
                onFilesUploaded={handleFilesUploaded}
                maxFiles={5}
                className="bg-background/95 backdrop-blur-sm border rounded-lg p-4"
              />
            </div>
          )}

          {/* Audio Recorder - shown when microphone button is clicked */}
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

          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-4 p-3 bg-background/95 backdrop-blur-sm border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Attached Files ({attachedFiles.length})</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachedFiles([])}
                  className="text-xs"
                >
                  Remove All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs"
                  >
                    <span className="truncate max-w-[120px]">{file.originalName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))
                      }
                      className="h-4 w-4"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <form
            ref={bottomRef}
            onSubmit={handleSubmit}
            className="flex items-end gap-2 w-full bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg"
          >
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
                className="h-[32px] w-[32px] shrink-0 text-muted-foreground hover:text-foreground"
                title="Web search"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </div>

            {/* Input field container */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                className="w-full resize-none rounded-md px-3 py-2 text-sm sm:text-base focus-visible:outline-none bg-transparent min-h-[44px] max-h-[200px] touch-manipulation"
                style={{
                  height: 'auto',
                  WebkitAppearance: 'none',
                  fontSize: '16px', // Prevents zoom on iOS
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
            </div>
          </form>

          {/* Optional: Action buttons row below input */}
          <div className="flex justify-center gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onReset()
                setInputValue('')
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto'
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Eraser className="h-3 w-3 mr-1" />
              Clear
            </Button>
            {onNewChat && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onNewChat()
                  setInputValue('')
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto'
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <NotebookPen className="h-3 w-3 mr-1" />
                New Chat
              </Button>
            )}
            {canSubmit && (
              <Button
                type="submit"
                form={bottomRef.current?.id}
                size="sm"
                onClick={handleSubmit}
                className="text-xs"
                title={
                  isOverLimit
                    ? 'Message too long'
                    : !trimmedValue
                      ? 'Enter a message'
                      : isSending
                        ? 'Sending...'
                        : 'Send message'
                }
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
