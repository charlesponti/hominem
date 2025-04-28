import { useUser } from '@clerk/react-router'
import { getAuth } from '@clerk/react-router/ssr.server'
import { Check, Copy, Terminal } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { Route } from './+types/cli'

export async function loader(args: Route.LoaderArgs) {
  // Get the Clerk auth state from the request
  const auth = await getAuth(args)
  const { userId, getToken } = auth

  // If no user is logged in, return null token
  if (!userId) {
    return { token: null, error: null }
  }

  try {
    // Generate a JWT token for the Clerk user that can be used with the CLI
    const token = await getToken({
      template: 'hominem-cli',
    })

    // Return the token
    return { token, error: null }
  } catch (error) {
    console.error('Token generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate token'
    return { token: null, error: errorMessage }
  }
}

export default function AuthCli({ loaderData }: Route.ComponentProps) {
  const { user, isLoaded } = useUser()
  const [searchParams] = useSearchParams()
  const urlToken = searchParams.get('token')
  const [copied, setCopied] = useState(false)

  // Get data from the loader
  const { token: loaderToken, error: loaderError } = loaderData

  // Use URL token if available, otherwise use loader token
  const authToken = urlToken || loaderToken
  const error = loaderError

  const handleCopyToken = () => {
    if (!authToken) return

    navigator.clipboard
      .writeText(authToken)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy token:', err)
      })
  }

  // Protected route that requires authentication
  if (isLoaded && !user) {
    // This will likely be handled by a route protection mechanism,
    // but keeping it for compatibility
    return <Navigate to="/sign-in" replace />
  }

  return (
    <div className="container max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            CLI Authentication
          </CardTitle>
          <CardDescription>
            Generate and manage authentication tokens for the Hominem CLI
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">{error}</div>
          ) : null}

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Your CLI Token</h3>
              <div className="flex relative items-center">
                <div className="bg-muted flex items-center pl-2 h-[3.125rem] rounded-l-md font-mono text-sm overflow-x-auto whitespace-pre">
                  <span className="overflow-hidden text-ellipsis">
                    {authToken || 'No token available'}
                  </span>
                </div>
                {authToken && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-4 h-[3.125rem] rounded-l-none rounded-r-md bg-gray-600 text-white"
                    onClick={handleCopyToken}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="sr-only">Copy token</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Generate New Token
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-md mt-4">
              <h3 className="text-sm font-medium mb-2">Using Your Token</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Configure the Hominem CLI with your token:
              </p>
              <div className="bg-background p-2 rounded font-mono text-xs">
                $ hominem config set token YOUR_TOKEN
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
