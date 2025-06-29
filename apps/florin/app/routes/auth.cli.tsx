import { type LoaderFunctionArgs, redirect } from 'react-router'
import { createSupabaseServerClient, getServerSession } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getServerSession(request)
  const { supabase } = createSupabaseServerClient(request)

  const url = new URL(request.url)
  const redirectUri = url.searchParams.get('redirect_uri')

  if (!redirectUri) {
    throw new Response('Missing redirect_uri parameter', { status: 400 })
  }

  if (user) {
    // User is already logged in, redirect with their access token
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      return redirect(`${redirectUri}?token=${session.access_token}&refresh_token=${session.refresh_token}`)
    }
  }

  // If not logged in, initiate Google OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri, // Supabase will redirect back to this URL after auth
    },
  })

  if (error) {
    console.error('Error initiating Google OAuth:', error)
    throw new Response(`Authentication failed: ${error.message}`, { status: 500 })
  }

  // Redirect to Google's OAuth page
  return redirect(data.url)
}

export default function AuthRoute() {
  return (
    <div>
      <h1>Authenticating...</h1>
      <p>You should be redirected to Google for authentication, then back to the CLI.</p>
    </div>
  )
}
