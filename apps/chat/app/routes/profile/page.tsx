import { Profile } from '@/components/profile'
import { getAuth } from '@clerk/react-router/ssr.server'
import { redirect } from 'react-router'
import type { Route } from './+types/page'

export async function loader(loaderArgs: Route.LoaderArgs) {
  const { userId } = await getAuth(loaderArgs)

  if (!userId) {
    return redirect('/')
  }

  return { userId }
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
