import { useFetcher } from 'react-router';

export interface EmailSignInProps {
  actionData:
    | {
        error?: string;
        success?: boolean;
        message?: string;
      }
    | undefined;
}

export function EmailSignIn({ actionData }: EmailSignInProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="heading-1 text-primary mb-2">Sign in with Email</h2>
          <p className="body-3 text-secondary">Enter your email to receive a verification code</p>
        </div>

        <fetcher.Form method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-text-primary mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input w-full"
              placeholder="you@example.com"
            />
          </div>

          {(actionData?.error || fetcher.data?.error) && (
            <div className="body-4 text-error">{actionData?.error || fetcher.data?.error}</div>
          )}

          {(actionData?.success || fetcher.data?.success) && (
            <div className="body-4 text-success">
              {actionData?.message || fetcher.data?.message}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </fetcher.Form>

        <div className="text-center body-4 text-secondary">
          <p>You'll receive a one-time code to sign in.</p>
        </div>
      </div>
    </div>
  );
}
