import { useAuthContext } from '@hominem/auth';
import { toast } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@hominem/ui/components/ui/alert';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@hominem/ui/components/ui/card';
import { cn } from '@hominem/ui/lib/utils';
import { AlertCircle, Building2, Link } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type PlaidLinkOnExit, type PlaidLinkOnSuccess, usePlaidLink } from 'react-plaid-link';

import { useCreateLinkToken, useExchangeToken } from '../../hooks/use-plaid';

interface PlaidLinkProps {
  onSuccess?: ((institutionName: string) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
  className?: string | undefined;
  variant?: 'default' | 'card' | undefined;
  children?: React.ReactNode | undefined;
}

export function PlaidLink({
  onSuccess,
  onError,
  className,
  variant = 'default',
  children,
}: PlaidLinkProps) {
  const { user } = useAuthContext();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);

  const {
    createLinkToken,
    isLoading: isCreatingToken,
    error: createTokenError,
  } = useCreateLinkToken();

  const userId = user?.id;
  const { exchangeToken, isLoading: isExchanging, error: exchangeError } = useExchangeToken();

  const initializeLinkToken = useCallback(() => {
    if (!(userId && !linkToken && !isCreatingToken)) {
      return;
    }

    createLinkToken.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          setLinkToken(result.linkToken);
        }
      },
      onError: (error) => {
        console.error('Failed to create link token:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to initialize Plaid Link'));
      },
    });
  }, [userId, linkToken, isCreatingToken, onError, createLinkToken]);

  const handleOnSuccess = useCallback<PlaidLinkOnSuccess>(
    (publicToken, metadata) => {
      if (!metadata.institution) {
        console.error('No institution data in metadata');
        return;
      }

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
              });
              onSuccess?.(result.institutionName);
            }
          },
          onError: (error) => {
            console.error('Failed to exchange token:', error);
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to connect bank account';
            toast({
              title: 'Connection Failed',
              description: errorMessage,
              variant: 'destructive',
            });
            onError?.(error instanceof Error ? error : new Error(errorMessage));
          },
        },
      );
    },
    [onSuccess, onError, exchangeToken],
  );

  const handleOnExit = useCallback<PlaidLinkOnExit>(
    (error) => {
      if (error) {
        console.error('Plaid Link error:', error);
        const errorMessage = error.error_message || 'Failed to connect bank account';
        toast({
          title: 'Connection Error',
          description: errorMessage,
          variant: 'destructive',
        });
        onError?.(new Error(errorMessage));
      }
    },
    [onError],
  );

  const config = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  const isLoading = isCreatingToken || isExchanging;
  const hasError = createTokenError || exchangeError;
  const isReady = ready && linkToken && !isLoading;

  useEffect(() => {
    if (isReady && shouldAutoOpen) {
      open();
      setShouldAutoOpen(false);
    }
  }, [isReady, shouldAutoOpen, open]);

  const handleClick = () => {
    if (isReady) {
      open();
    } else if (!(linkToken && isLoading)) {
      setShouldAutoOpen(true);
      initializeLinkToken();
    }
  };

  if (variant === 'card') {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader className="text-center">
          <div className="mb-4 flex size-12 items-center justify-center border border-primary">
            <Building2 className="size-6 text-primary" />
          </div>
          <CardTitle>Connect Your Bank Account</CardTitle>
          <CardDescription>
            Securely connect your bank account to import transactions and track your finances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
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
                <div className="mr-2 size-4 border-2 border-b-transparent" />
                {isCreatingToken
                  ? 'Initializing...'
                  : isExchanging
                    ? 'Connecting...'
                    : 'Loading...'}
              </>
            ) : (
              <>
                <Link className="mr-2 size-4" />
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
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={!isReady && !(!linkToken && !isLoading)}
      className={cn('flex items-center gap-2', className)}
    >
      {isLoading ? (
        <>
          <div className="size-4 border-2 border-b-transparent" />
          {isCreatingToken ? 'Initializing...' : isExchanging ? 'Connecting...' : 'Loading...'}
        </>
      ) : (
        <>
          <Building2 className="size-4" />
          {children || 'Connect Bank Account'}
        </>
      )}
    </Button>
  );
}

export function PlaidConnectButton({
  onSuccess,
  onError,
  children,
  className,
}: Omit<PlaidLinkProps, 'variant'> &
  Omit<React.ComponentProps<typeof Button>, 'onClick' | 'disabled'> & {
    onError: (error: Error) => void;
  }) {
  return (
    <PlaidLink onSuccess={onSuccess} onError={onError} variant="default" className={className}>
      {children}
    </PlaidLink>
  );
}
