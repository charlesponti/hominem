import { useUser } from '@clerk/react-router'
import { Check, Copy, Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default function AuthCli() {
  const { user, isLoaded } = useUser()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [copied, setCopied] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reset copy state when token changes
    setCopied(false)

    if (token) {
      // If token is provided in URL, use it
      setAuthToken(token)
    } else if (user) {
      // Otherwise, fetch a new token
      fetchAuthToken()
    }
  }, [token, user])

  const fetchAuthToken = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/cli')
      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.statusText}`)
      }

      const data = await response.json()
      setAuthToken(data.token)
    } catch (err) {
      console.error('Error fetching CLI auth token:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate CLI token')
    } finally {
      setIsLoading(false)
    }
  }

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
              <div className="relative">
                <div className="bg-muted p-3 rounded-md font-mono text-sm overflow-x-auto whitespace-pre">
                  {isLoading ? (
                    <div className="animate-pulse h-6 bg-muted-foreground/20 rounded" />
                  ) : authToken ? (
                    authToken
                  ) : (
                    'No token generated yet'
                  )}
                </div>
                {authToken && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 w-8 p-0"
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
              <Button onClick={fetchAuthToken} disabled={isLoading} className="w-full">
                {isLoading ? 'Generating...' : 'Generate New Token'}
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
