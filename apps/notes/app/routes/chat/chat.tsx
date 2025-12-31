import { getServerSession } from '~/lib/auth.server'
import { type LoaderFunctionArgs, redirect } from 'react-router'
import { createServerTRPCClient } from '~/lib/trpc/server'
import { getOrCreateChat } from '~/lib/utils/chat-loader-utils'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await getServerSession(request)
  if (!user || !session) {
    return redirect('/', { headers })
  }

  const trpcClient = createServerTRPCClient(session.access_token)
  const { chatId } = await getOrCreateChat(trpcClient)

  return redirect(`/chat/${chatId}`, { headers })
}
