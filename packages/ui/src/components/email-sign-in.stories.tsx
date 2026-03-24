// EmailSignIn uses react-router's useFetcher which requires a router context.
// This story shows the visual composition without the router dependency.

const meta = {
  title: 'Auth/EmailSignIn',
  tags: ['autodocs'],
};
export default meta;

function EmailSignInPreview({
  error,
  success,
  message,
  isSubmitting = false,
}: {
  error?: string;
  success?: boolean;
  message?: string;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Sign in with Email</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a verification code
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full h-9 rounded-md border px-3 text-sm"
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
          {success && message && <div className="text-sm text-green-600">{message}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          <p>You'll receive a one-time code to sign in.</p>
        </div>
      </div>
    </div>
  );
}

export const Default = {
  render: () => <EmailSignInPreview />,
};

export const WithError = {
  render: () => <EmailSignInPreview error="This email is not registered." />,
};

export const Success = {
  render: () => <EmailSignInPreview success message="Verification code sent! Check your inbox." />,
};

export const Submitting = {
  render: () => <EmailSignInPreview isSubmitting />,
};
