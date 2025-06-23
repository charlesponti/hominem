import { AlertCircle, Building2, CreditCard, Link } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnExit, type PlaidLinkOnSuccess } from 'react-plaid-link'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { toast } from '~/components/ui/use-toast'
import { useCreateLinkToken, useExchangeToken } from '~/lib/hooks/use-plaid'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { cn } from '~/lib/utils'

interface PlaidLinkProps {
  onSuccess?: (institutionName: string) => void
  onError?: (error: Error) => void
  className?: string
  variant?: 'default' | 'card'
  children?: React.ReactNode
}

export function PlaidLink({
  onSuccess,
  onError,
  className,
  variant = 'default',
  children,
}: PlaidLinkProps) {
  const { getUser } = useSupabaseAuth()
  const [user, setUser] = useState(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false)

  const {
    createLinkToken,
    isLoading: isCreatingToken,
    error: createTokenError,
  } = useCreateLinkToken()

  const { exchangeToken, isLoading: isExchanging, error: exchangeError } = useExchangeToken()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    fetchUser()
  }, [getUser])

  const userId = user?.id

  // Initialize link token only when user clicks the button
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const initializeLinkToken = useCallback(() => {
    if (!userId || linkToken || isCreatingToken) return

    createLinkToken.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          setLinkToken(result.linkToken)
        }
      },
      onError: (error) => {
        console.error('Failed to create link token:', error)
        onError?.(error instanceof Error ? error : new Error('Failed to initialize Plaid Link'))
      },
    })
  }, [userId, linkToken, isCreatingToken, onError])

  // Handle successful connection
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const handleOnSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken, metadata) => {
      if (!metadata.institution) {
        console.error('No institution data in metadata')
        return
      }

      // Use the current exchangeToken mutation directly
      exchangeToken.mutate(
        {
          publicToken,
          institutionId: metadata.institution.institution_id,
          institutionName: metadata.institution.name,
        },
        {
          onSuccess: (result) => {
            if (result.success) {
              toast({
                title: 'Bank Account Connected!',
                description: result.message,
              })
              onSuccess?.(result.institutionName)
            }
          },
          onError: (error) => {
            console.error('Failed to exchange token:', error)
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to connect bank account'
            toast({
              title: 'Connection Failed',
              description: errorMessage,
              variant: 'destructive',
            })
            onError?.(error instanceof Error ? error : new Error(errorMessage))
          },
        }
      )
    },
    [onSuccess, onError]
  )

  // Handle connection errors
  const handleOnExit = useCallback<PlaidLinkOnExit>(
    (error, metadata) => {
      if (error) {
        console.error('Plaid Link error:', error)
        const errorMessage = error.error_message || 'Failed to connect bank account'
        toast({
          title: 'Connection Error',
          description: errorMessage,
          variant: 'destructive',
        })
        onError?.(new Error(errorMessage))
      }
    },
    [onError]
  )

  // Configure Plaid Link
  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  }

  const { open, ready } = usePlaidLink(config)

  const isLoading = isCreatingToken || isExchanging
  const hasError = createTokenError || exchangeError
  const isReady = ready && linkToken && !isLoading

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (isReady && shouldAutoOpen) {
      open()
      setShouldAutoOpen(false) // Prevent multiple opens
    }
  }, [isReady, shouldAutoOpen, open])

  const handleClick = () => {
    if (isReady) {
      open()
    } else if (!linkToken && !isLoading) {
      // Initialize link token when user clicks
      setShouldAutoOpen(true) // Enable auto-open after token creation
      initializeLinkToken()
    }
  }

  if (variant === 'card') {
    return (
      <Card className={cn('w-full max-w-md', className)}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Connect Your Bank Account</CardTitle>
          <CardDescription>
            Securely connect your bank account to import transactions and track your finances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                {createTokenError || exchangeError
                  ? 'Failed to connect bank account'
                  : 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleClick}
            disabled={!isReady && !(!linkToken && !isLoading)}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                {isCreatingToken
                  ? 'Initializing...'
                  : isExchanging
                    ? 'Connecting...'
                    : 'Loading...'}
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Connect Bank Account
              </>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            <p>Your data is encrypted and secure.</p>
            <p>We use bank-level security provided by Plaid.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default button variant
  return (
    <div className={className}>
      {hasError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {createTokenError || exchangeError
              ? 'Failed to connect bank account'
              : 'An unknown error occurred'}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleClick}
        disabled={!isReady && !(!linkToken && !isLoading)}
        className="w-full"
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
            {isCreatingToken ? 'Initializing...' : isExchanging ? 'Connecting...' : 'Loading...'}
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {children || 'Connect Bank Account'}
          </>
        )}
      </Button>
    </div>
  )
}

export function PlaidConnectButton({
  onSuccess,
  onError,
  children,
  className,
}: Omit<PlaidLinkProps, 'variant'> &
  Omit<React.ComponentProps<typeof Button>, 'onClick' | 'disabled'> & {
    onError: (error: Error) => void
  }) {
  return (
    <PlaidLink onSuccess={onSuccess} onError={onError} variant="default" className={className}>
      {children}
    </PlaidLink>
  )
}
