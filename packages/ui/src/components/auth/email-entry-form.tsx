import { Form, useNavigation } from 'react-router';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AuthErrorBanner } from './auth-error-banner';
import { PasskeyButton } from './passkey-button';

interface EmailEntryFormProps {
  action: string;
  method?: 'post' | 'get';
  error?: string;
  onPasskeyClick?: () => void | Promise<void>;
  loadingMessage?: string;
  className?: string;
}

export function EmailEntryForm({
  action,
  method = 'post',
  error,
  onPasskeyClick,
  loadingMessage = 'Sending...',
  className,
}: EmailEntryFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting' && navigation.formAction === action;

  const hasPasskey = onPasskeyClick !== undefined;

  return (
    <Form method={method} action={action} className={className}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-foreground">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            disabled={isSubmitting}
            className="mt-1"
          />
        </div>

        <AuthErrorBanner error={error ?? null} />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? loadingMessage : 'Continue'}
        </Button>

        {hasPasskey && onPasskeyClick && (
          <PasskeyButton
            onClick={onPasskeyClick}
            disabled={isSubmitting}
            isLoading={false}
            className="w-full"
          />
        )}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        We&apos;ll send a one-time code to your email.
      </p>
    </Form>
  );
}
