import { redirect } from 'react-router'
import { StreamingChatInterface } from '~/components/chat/StreamingChatInterface'
import { getServerSession } from '~/lib/supabase/server'
import type { Route } from './+types/page'

export async function loader(args: Route.LoaderArgs) {
  console.log('=== Chat Page Loader Debug ===')
  console.log('Request headers:', Object.fromEntries(args.request.headers.entries()))
  console.log('Cookie header:', args.request.headers.get('Cookie'))

  const { user } = await getServerSession(args.request)

  console.log('user', user)

  if (!user) {
    console.log('No user found, redirecting to home')
    return redirect('/')
  }

  console.log('User authenticated, proceeding to chat')
  return { userId: user.id }
}

export default function ChatPage() {
  return (
    <div className="relative h-screen">
      <StreamingChatInterface />
    </div>
  )
}
