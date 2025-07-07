// Services
export { ChatService } from './service/chat.service'
export { MessageService } from './service/message.service'

// Types
export type {
  CreateChatParams,
  SearchChatsParams,
  ChatStats,
} from './service/chat.service'

export type {
  CreateMessageParams,
  ChatMessagesOptions,
} from './service/message.service'

// Error class
export { ChatError } from './service/chat.service'

// Utilities
export { AuthUtils } from './utils/auth.utils'
