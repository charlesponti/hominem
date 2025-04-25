'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { CheckCircleIcon, ClipboardCopyIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function CLIAuthPage() {
  const { isSignedIn, user } = useUser()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)

  // Fetch CLI token when user is signed in
  useEffect(() => {
    async function fetchToken() {
      if (!isSignedIn) return

      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/auth/cli')

        if (!response.ok) {
          throw new Error('Failed to generate token')
        }

        const data = await response.json()
        setToken(data.token)
      } catch (err) {
        setError('An error occurred while generating your CLI token')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchToken()
  }, [isSignedIn])

  // Handle auto-closing for CLI flow
  useEffect(() => {
    // Check if this was opened via CLI using URL params
    const searchParams = new URLSearchParams(window.location.search)
    const fromCLI = searchParams.get('from') === 'cli'

    if (fromCLI && token) {
      // Auto-close after delay when token is received
      const timer = setTimeout(() => {
        setClosing(true)
        window.close()
      }, 5000)

      return () => clearTimeout(timer)
    }

    return () => {}
  }, [token])

  // Copy token to clipboard
  const copyToClipboard = async () => {
    if (!token) return

    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
      setError('Failed to copy token to clipboard')
    }
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CLI Authentication</CardTitle>
            <CardDescription>
              Please sign in to generate a token for the Hominem CLI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>You need to be signed in to generate a CLI token.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasGoogleAccount = user?.externalAccounts?.some((acc) => acc.provider === 'google')

  const googleAccountMessage = hasGoogleAccount
    ? 'Google account connected! Google commands will work in CLI.'
    : 'Google account not connected. Connect it in account settings to use Google commands in CLI.'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>CLI Authentication</CardTitle>
          <CardDescription>Generate an authentication token for the Hominem CLI</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
              <p className="mt-2">Generating token...</p>
            </div>
          ) : error ? (
            <div className="py-4 text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : token ? (
            <>
              <div className="mb-4">
                <p className="mb-2 font-medium">Your CLI Token:</p>
                <div className="relative">
                  <div className="rounded-md bg-muted p-3 font-mono text-sm break-all">{token}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ClipboardCopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* OAuth Connection Status */}
              <div className="mb-4 grid grid-cols-1 gap-3">
                <div
                  className={cn('rounded-md p-3', {
                    'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300':
                      hasGoogleAccount,
                    'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300':
                      !hasGoogleAccount,
                  })}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-2">
                      {hasGoogleAccount ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <title>Warning</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm font-medium">{googleAccountMessage}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-blue-50 p-3 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                <h3 className="font-semibold">How to use this token:</h3>
                <ol className="ml-4 mt-2 list-decimal space-y-1">
                  <li>Copy the token above</li>
                  <li>
                    In your terminal, run:{' '}
                    <code className="rounded bg-blue-200 px-1 dark:bg-blue-800/30">
                      hominem api auth --token [paste-token-here]
                    </code>
                  </li>
                </ol>
              </div>

              {closing && (
                <div className="mt-4 rounded-md bg-green-50 p-3 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  <p>
                    Authentication successful! This window will close automatically in a few
                    seconds.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p>Preparing to generate your CLI token...</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Logged in as: {user?.primaryEmailAddress?.emailAddress}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
