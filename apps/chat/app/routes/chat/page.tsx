import { redirect } from 'react-router'
import { StreamingChatInterface } from '~/components/chat/StreamingChatInterface'
import { getServerSession } from '~/lib/supabase/server'
import type { Route } from './+types/page'

export async function loader(args: Route.LoaderArgs) {
  const { user } = await getServerSession(args.request)

  if (!user) {
    return redirect('/')
  }

  return { userId: user.id }
}

export default function ChatPage() {
  return (
    <div className="relative h-screen">
      <StreamingChatInterface />
    </div>
  )
}
