import type { ExtendedMessage } from '~/lib/types/chat-message'

/**
 * Filters messages by search query (case-insensitive)
 */
export function filterMessagesByQuery(
  messages: ExtendedMessage[],
  query: string
): ExtendedMessage[] {
  if (!query.trim()) return messages
  const lowerQuery = query.toLowerCase()
  return messages.filter((message) => message.content.toLowerCase().includes(lowerQuery))
}

/**
 * Finds the previous user message before the given index
 */
export function findPreviousUserMessage(
  messages: ExtendedMessage[],
  startIndex: number
): ExtendedMessage | undefined {
  let index = startIndex - 1
  while (index >= 0) {
    const message = messages[index]
    if (message && message.role === 'user') {
      return message
    }
    index--
  }
  return undefined
}

/**
 * Finds the next assistant message after the given index
 */
export function findNextAssistantMessage(
  messages: ExtendedMessage[],
  startIndex: number
): ExtendedMessage | undefined {
  const index = messages.findIndex((m, idx) => idx > startIndex && m.role === 'assistant')
  if (index === -1) return undefined
  return messages[index]
}
