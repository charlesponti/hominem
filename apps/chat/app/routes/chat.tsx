import { redirect, type LoaderFunctionArgs } from 'react-router'
import { ChatDatabaseService } from '~/lib/services/chat-db.server'
import { getServerSession } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  // Note: We still call getServerSession here because this loader does server-side
  // redirects and needs the session data. The main optimization was removing the
  // duplicate call in chat.$chatId.tsx where the data was already available from root.
  const { user, hominemUser } = await getServerSession(request)

  if (!user || !hominemUser) {
    return redirect('/')
  }

  try {
    // Get user's latest chats (limit to 1 since we only need the most recent)
    const chats = await ChatDatabaseService.getUserChats(hominemUser.id, 1)

    if (chats.length > 0) {
      // User has chats, redirect to the latest one
      return redirect(`/chat/${chats[0].id}`)
    }

    // No chats exist, create a new one
    const newChat = await ChatDatabaseService.createChat({
      title: 'New Chat',
      userId: hominemUser.id,
    })
    return redirect(`/chat/${newChat.id}`)
  } catch (error) {
    console.error('Failed to handle chat redirection:', error)
    // Fallback: create a new chat if something goes wrong
    try {
      const newChat = await ChatDatabaseService.createChat({
        title: 'New Chat',
        userId: hominemUser.id,
      })
      return redirect(`/chat/${newChat.id}`)
    } catch (createError) {
      console.error('Failed to create fallback chat:', createError)
      throw new Response('Failed to initialize chat', { status: 500 })
    }
  }
}
