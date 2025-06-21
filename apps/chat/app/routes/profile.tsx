import { Profile } from '@/components/profile'
import { getServerSession } from '@/lib/supabase/server'
import { redirect } from 'react-router'
import type { Route } from './+types/page'

export async function loader(loaderArgs: Route.LoaderArgs) {
  const session = await getServerSession(loaderArgs.request)

  if (!session?.user) {
    return redirect('/')
  }

  return { userId: session.user.id }
}

// Using the proper parameter name without destructuring
export function meta(args: Route.MetaArgs) {
  return [
    { title: 'Profile', foo: 'bar' },
    { name: 'description', content: 'User profile page' },
  ]
}

export default function ProfilePage() {
  return <Profile />
}
