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
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            Sign in with Email
          </h2>
          <p style={{ color: '#9ca3af' }}>Enter your email to receive a verification code</p>
        </div>

        <fetcher.Form
          method="post"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#d1d5db',
                marginBottom: '4px',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                backgroundColor: '#1f2937',
                color: '#fff',
                outline: 'none',
              }}
              placeholder="you@example.com"
            />
          </div>

          {(actionData?.error || fetcher.data?.error) && (
            <div style={{ fontSize: '14px', color: '#ef4444' }}>
              {actionData?.error || fetcher.data?.error}
            </div>
          )}

          {(actionData?.success || fetcher.data?.success) && (
            <div style={{ fontSize: '14px', color: '#22c55e' }}>
              {actionData?.message || fetcher.data?.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </fetcher.Form>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#9ca3af' }}>
          <p>You'll receive a one-time code to sign in.</p>
        </div>
      </div>
    </div>
  );
}
