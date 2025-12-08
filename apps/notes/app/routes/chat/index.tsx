import { type LoaderFunctionArgs, redirect } from 'react-router'
import { getServerSession } from '~/lib/supabase/server'
import { createServerTRPCClient } from '~/lib/trpc-server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session } = await getServerSession(request)
  if (!user || !session) {
    return redirect('/')
  }

  const trpcClient = createServerTRPCClient(session.access_token)

  const [firstChat] = await trpcClient.chats.getUserChats.query({
    limit: 1,
  })

  if (firstChat) {
    return redirect(`/chat/${firstChat.id}`)
  }

  const newChat = await trpcClient.chats.createChat.mutate({
    title: 'New Chat',
  })

  return redirect(`/chat/${newChat.chat.id}`)
}
