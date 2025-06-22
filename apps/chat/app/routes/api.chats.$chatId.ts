import type { LoaderFunctionArgs } from 'react-router'
import { ChatDatabaseService } from '~/lib/services/chat-db.server.js'
import { jsonResponse } from '~/lib/utils/json-response'

// GET /api/chats/:chatId - Get specific chat with messages
export async function loader({ params }: LoaderFunctionArgs) {
  const { chatId } = params

  if (!chatId) {
    return jsonResponse({ error: 'Chat ID is required' }, { status: 400 })
  }

  try {
    const chat = await ChatDatabaseService.getChatById(chatId, true)

    if (!chat) {
      return jsonResponse({ error: 'Chat not found' }, { status: 404 })
    }

    return jsonResponse({ chat })
  } catch (error) {
    console.error('Failed to get chat:', error)
    return jsonResponse({ error: 'Failed to load chat' }, { status: 500 })
  }
}
