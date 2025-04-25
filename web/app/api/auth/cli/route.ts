import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // Get the Clerk user from the current request
  const { userId, getToken } = await auth()

  // Return unauthorized if no user is logged in
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    // Generate a JWT token for the Clerk user that can be used with the API
    const token = await getToken({
      template: 'hominem-cli',
    })

    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Check if the user has a Google account
      let googleTokens: unknown[] = []
      try {
        const googleAccount = user.externalAccounts.find(
          (account) => account.provider === 'oauth_google'
        )
        if (googleAccount) {
          const response = await client.users.getUserOauthAccessToken(user.id, 'google')
          googleTokens = response.data
          if (!googleTokens.length) {
            return NextResponse.json({ error: 'No Google token found' }, { status: 404 })
          }
        }
      } catch (error) {
        console.error('Error fetching Google tokens:', error)
      }

      // Return the token for CLI to save
      return NextResponse.json({
        userId,
        token,
        googleTokens,
      })
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (error: any) {
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
