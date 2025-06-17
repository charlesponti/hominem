import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { ChatDatabaseService } from '~/lib/services/chat-db.server.js'
import { withRateLimit } from '~/lib/services/rate-limit.server.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  const limit = Number(url.searchParams.get('limit')) || 50

  if (!userId || userId === 'anonymous') {
    return jsonResponse({ chats: [] })
  }

  try {
    const chats = await ChatDatabaseService.getUserChats(userId, limit)
    return jsonResponse({ chats })
  } catch (error) {
    console.error('Failed to get user chats:', error)
    return jsonResponse({ chats: [], error: 'Failed to load chats' }, { status: 500 })
  }
}

// POST /api/chats - Create new chat or manage chat operations
export async function action({ request }: ActionFunctionArgs) {
  return withRateLimit('chatStream')(request, async () => {
    try {
      const { action, ...data } = await request.json()

      switch (action) {
        case 'create':
          return await createChat(data)

        case 'delete':
          return await deleteChat(data)

        case 'updateTitle':
          return await updateChatTitle(data)

        case 'getStats':
          return await getChatStats(data)

        case 'search':
          return await searchChats(data)

        default:
          return jsonResponse({ error: 'Invalid action' }, { status: 400 })
      }
    } catch (error) {
      console.error('Chat API error:', error)
      return jsonResponse(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  })
}

async function createChat(data: { title: string; userId: string }) {
  const { title, userId } = data

  if (!title || !userId || userId === 'anonymous') {
    return jsonResponse({ error: 'Title and userId are required' }, { status: 400 })
  }

  try {
    const chat = await ChatDatabaseService.createChat({ title, userId })
    return jsonResponse({ chat })
  } catch (error) {
    console.error('Failed to create chat:', error)
    return jsonResponse({ error: 'Failed to create chat' }, { status: 500 })
  }
}

async function deleteChat(data: { chatId: string }) {
  const { chatId } = data

  if (!chatId) {
    return jsonResponse({ error: 'Chat ID is required' }, { status: 400 })
  }

  try {
    const success = await ChatDatabaseService.deleteChat(chatId)
    return jsonResponse({ success })
  } catch (error) {
    console.error('Failed to delete chat:', error)
    return jsonResponse({ error: 'Failed to delete chat' }, { status: 500 })
  }
}

async function updateChatTitle(data: { chatId: string; title: string }) {
  const { chatId, title } = data

  if (!chatId || !title) {
    return jsonResponse({ error: 'Chat ID and title are required' }, { status: 400 })
  }

  try {
    const success = await ChatDatabaseService.updateChatTitle(chatId, title)
    return jsonResponse({ success })
  } catch (error) {
    console.error('Failed to update chat title:', error)
    return jsonResponse({ error: 'Failed to update chat title' }, { status: 500 })
  }
}

async function getChatStats(data: { userId: string }) {
  const { userId } = data

  if (!userId || userId === 'anonymous') {
    return jsonResponse({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const stats = await ChatDatabaseService.getUserChatStats(userId)
    return jsonResponse({ stats })
  } catch (error) {
    console.error('Failed to get chat stats:', error)
    return jsonResponse({ error: 'Failed to get chat statistics' }, { status: 500 })
  }
}

async function searchChats(data: { userId: string; query: string; limit?: number }) {
  const { userId, query, limit = 20 } = data

  if (!userId || userId === 'anonymous' || !query) {
    return jsonResponse({ error: 'User ID and query are required' }, { status: 400 })
  }

  try {
    const chats = await ChatDatabaseService.searchChats(userId, query, limit)
    return jsonResponse({ chats })
  } catch (error) {
    console.error('Failed to search chats:', error)
    return jsonResponse({ error: 'Failed to search chats' }, { status: 500 })
  }
}
