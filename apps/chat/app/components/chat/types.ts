import type { ProcessedFile } from '~/lib/services/file-processor.server.js'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  audioUrl?: string
  files?: ProcessedFile[]
}

export interface SearchResult {
  title: string
  snippet: string
  url?: string
}

export interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  error?: string
  context?: string
}

export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  currentStreamingMessage?: string
}

export interface TTSState {
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
}

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  disabled: boolean
  canSubmit: boolean
  isOverLimit: boolean
  characterCount: number
  maxLength: number
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

export interface AttachmentsPreviewProps {
  files: ProcessedFile[]
  onRemoveFile: (fileId: string) => void
  onRemoveAll: () => void
}

export interface SearchContextPreviewProps {
  searchContext: string
  onRemove: () => void
}

export interface MessagesListProps {
  messages: ChatMessage[]
  currentStreamingMessage?: string
  error: string | null
  onRetry: () => void
}

export interface ChatControlsProps {
  onClearChat: () => void
  disabled: boolean
}

export interface ActionButtonsProps {
  onAttachment: () => void
  onWebSearch: () => void
  onMicrophone: () => void
  onVoiceMode: () => void
  onSubmit: () => void
  onStop: () => void
  showFileUploader: boolean
  showAudioRecorder: boolean
  isVoiceMode: boolean
  isSpeaking: boolean
  isSearching: boolean
  isStreaming: boolean
  canSubmit: boolean
  hasAttachments: boolean
  hasSearchContext: boolean
  isOverLimit: boolean
  trimmedValue: string
  attachedFilesCount: number
}
