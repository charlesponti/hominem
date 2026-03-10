import { readAuthErrorMessage } from '@hominem/auth';
import { AuthScaffold, EmailEntryForm, usePasskeyAuth } from '@hominem/ui';
import { redirect, useActionData, useLocation, type ActionFunctionArgs } from 'react-router';

import { getServerAuth } from '~/lib/auth.server';
import { serverEnv } from '~/lib/env';

export async function loader({ request }: { request: Request }) {
  const { user, headers } = await getServerAuth(request);
  if (user) {
    return redirect('/notes', { headers });
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const next = (formData.get('next') as string) || '/notes';

  if (!email) {
    return { error: 'Email is required' };
  }

  try {
    const response = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/email-otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: 'sign-in' }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to send verification code' };
    }

    return redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
    );
  } catch {
    return { error: 'Failed to send verification code' };
  }
}

export default function AuthPage() {
  const actionData = useActionData<typeof action>();
  const location = useLocation();
  const {
    authenticate,
    isLoading: isPasskeyLoading,
    error: passkeyError,
    isSupported: isPasskeySupported,
  } = usePasskeyAuth();
  const callbackError = readAuthErrorMessage(new URLSearchParams(location.search));

  const handlePasskeyAuth = async () => {
    const result = await authenticate();
    if (result) {
      window.location.href = '/notes';
    }
  };

  const emailEntryProps = {
    action: '/auth',
    error: actionData?.error ?? callbackError ?? passkeyError ?? undefined,
    ...(isPasskeySupported && { onPasskeyClick: handlePasskeyAuth }),
    ...(isPasskeyLoading && { loadingMessage: 'Authenticating with passkey...' }),
  };

  return (
    <AuthScaffold title="Continue to Notes" description="Enter your email to sign in">
      <EmailEntryForm {...emailEntryProps} />
    </AuthScaffold>
  );
}
