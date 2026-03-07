import { redirect } from 'react-router'

import { getServerSession } from '~/lib/auth.server'
import { serverEnv } from '~/lib/env'

export async function action({ request }: { request: Request }) {
  const { headers } = await getServerSession(request)
  
  try {
    await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Ignore errors during logout
  }

  return redirect('/auth', { headers })
}

export async function loader() {
  return redirect('/auth')
}
