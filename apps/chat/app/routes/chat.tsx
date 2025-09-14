import { redirect, type LoaderFunctionArgs } from 'react-router'
import { getServerSession } from '~/lib/supabase/server'
import { createServerTRPCClient } from '~/lib/trpc-server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session } = await getServerSession(request)
  if (!user || !session) {
    return redirect('/')
  }

  const trpcClient = createServerTRPCClient(session.access_token)

  const chats = await trpcClient.chats.getUserChats.query({
    limit: 1,
  })
  if (chats.length > 0) {
    return redirect(`/chat/${chats[0].id}`)
  }

  const newChat = await trpcClient.chats.createChat.mutate({
    title: 'New Chat',
    userId: user.id,
  })

  return redirect(`/chat/${newChat.chat.id}`)
}
