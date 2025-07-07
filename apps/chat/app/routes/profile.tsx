import type { User } from '@supabase/supabase-js'
import { redirect, useRouteLoaderData } from 'react-router'
import { Profile } from '~/components/profile'
import { getServerSession } from '~/lib/supabase/server'
import type { Route } from './+types/profile'

export async function loader(loaderArgs: Route.LoaderArgs) {
  const session = await getServerSession(loaderArgs.request)

  if (!session?.user) {
    return redirect('/')
  }

  return { user: session.user }
}

// Using the proper parameter name without destructuring
export function meta(args: Route.MetaArgs) {
  return [{ title: 'Profile' }, { name: 'description', content: 'User profile page' }]
}

export default function ProfilePage() {
  const { user } = useRouteLoaderData<{ user: User }>('profile')
  return <Profile user={user} />
}
