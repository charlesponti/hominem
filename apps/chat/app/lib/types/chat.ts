// Shared chat types for both client and server
import type { ChatMessageSelect } from '@hominem/chat-service'
import type { ProcessedFile } from './upload'

// Re-export ProcessedFile for convenience
export type { ProcessedFile } from './upload'

// ============================================================================
// Core Chat Types
// ============================================================================

/**
 * Base chat entity from database
 */
export interface Chat {
  id: string
  title: string
  userId: string
  createdAt: string
  updatedAt: string
}

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * File attachment types in messages
 */
export interface ChatMessageFile {
  type: 'image' | 'file'
  filename?: string
  mimeType?: string
  size?: number
  url?: string
  [key: string]: unknown
}

/**
 * Tool call information for AI interactions
 */
export interface ChatMessageToolCall {
  type: 'tool-call' | 'tool-result'
  toolName: string
  toolCallId?: string
  args?: Record<string, unknown>
  result?: unknown
  isError?: boolean
}

/**
 * Reasoning information for AI responses
 */
export interface ChatMessageReasoning {
  type: 'reasoning' | 'redacted-reasoning'
  text: string
  signature?: string
}

/**
 * Complete chat message from database
 */
export interface ChatMessage {
  id: string
  chatId: string
  userId: string
  role: MessageRole
  content: string
  toolCalls?: ChatMessageToolCall[]
  reasoning?: string
  files?: ChatMessageFile[]
  parentMessageId?: string
  createdAt: string
  updatedAt: string
  // Client-side properties
  timestamp?: Date
  isStreaming?: boolean
  audioUrl?: string
}

/**
 * Chat with its messages (database format)
 */
export interface ChatWithMessages extends Chat {
  messages: ChatMessageSelect[]
}

/**
 * Database types re-exported for convenience
 */
export type { ChatMessageSelect } from '@hominem/chat-service'

/**
 * File attachment in chat UI (simplified for display)
 */
export interface ChatFileAttachment {
  id: string
  name: string
  type: string
  size: number
  isUploading?: boolean
  uploadProgress?: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Search result for web search integration
 */
export interface SearchResult {
  title: string
  snippet: string
  url?: string
  relevance?: number
}

/**
 * Search response from search API
 */
export interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  error?: string
  context?: string
  totalResults?: number
}

// ============================================================================
// Client State Types
// ============================================================================

/**
 * Chat state for client-side management
 */
export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  currentStreamingMessage?: string
  isLoading?: boolean
}

/**
 * Text-to-speech state
 */
export interface TTSState {
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
  currentMessageId?: string
}

/**
 * Voice input state
 */
export interface VoiceInputState {
  isRecording: boolean
  isProcessing: boolean
  error: string | null
  transcript?: string
}

// ============================================================================
// Hook Return Types
// ============================================================================

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Chat message component props
 */
export interface ChatMessageProps {
  message: ChatMessage
  isLast?: boolean
  onRegenerate?: () => void
  onEdit?: (content: string) => void
  onDelete?: () => void
  onCopy?: () => void
  onSpeak?: () => void
}

/**
 * Attachments preview component props
 */
export interface AttachmentsPreviewProps {
  files: ChatFileAttachment[]
  onRemoveFile: (fileId: string) => void
  onRemoveAll: () => void
  maxFiles?: number
  maxSize?: number
}

/**
 * Search context preview component props
 */
export interface SearchContextPreviewProps {
  searchContext: string
  onRemove: () => void
  isLoading?: boolean
}

/**
 * Chat controls component props
 */
export interface ChatControlsProps {
  onClearChat: () => void
  onNewChat?: () => void
  onExportChat?: () => void
  disabled: boolean
  isStreaming?: boolean
}

/**
 * Chat input component props
 */
export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (
    message: string,
    options?: {
      files?: ProcessedFile[]
      searchContext?: string
      voiceMode?: boolean
    }
  ) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  enableVoice?: boolean
  enableFileUpload?: boolean
  enableSearch?: boolean
}

// ============================================================================
// Database Service Types
// ============================================================================

/**
 * Parameters for creating a message
 */
export interface CreateMessageParams {
  chatId: string
  userId: string
  role: MessageRole
  content: string
  files?: ChatMessageFile[]
  toolCalls?: ChatMessageToolCall[]
  reasoning?: string
  parentMessageId?: string
}

/**
 * Parameters for updating a chat
 */
export interface UpdateChatParams {
  id: string
  title?: string
  updatedAt?: string
}

/**
 * Chat statistics
 */
export interface ChatStats {
  totalChats: number
  totalMessages: number
  averageMessagesPerChat: number
  lastChatDate?: string
  oldestChatDate?: string
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Chat-specific error types
 */
export type ChatErrorType =
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'FILE_PROCESSING_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Chat error interface
 */
export interface ChatError {
  type: ChatErrorType
  message: string
  code?: string
  details?: Record<string, unknown>
  timestamp: Date
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Chat configuration
 */
export interface ChatConfig {
  maxMessagesPerChat: number
  maxFileSize: number
  maxFilesPerMessage: number
  supportedFileTypes: string[]
  enableVoiceInput: boolean
  enableSearch: boolean
  enableTTS: boolean
  rateLimits: {
    messagesPerMinute: number
    messagesPerHour: number
  }
}
