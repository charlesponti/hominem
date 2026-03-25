import { readAuthErrorMessage, usePasskeyAuth } from '@hominem/auth';
import { resolveSafeAuthRedirect } from '@hominem/auth/server-utils';
import { AuthScaffold, EmailEntryForm } from '@hominem/ui';
import { redirect, useActionData, useLocation, useSearchParams } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { getServerAuth } from '~/lib/auth.server';

import { AUTH_CONFIG, getAuthApiBaseUrl } from './config';

export async function loader({ request }: { request: Request }) {
  const { user, headers } = await getServerAuth(request);
  if (user) {
    const url = new URL(request.url);
    return redirect(
      resolveSafeAuthRedirect(url.searchParams.get('next'), AUTH_CONFIG.defaultRedirect, [
        ...AUTH_CONFIG.allowedRedirectPrefixes,
      ]),
      { headers },
    );
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = (await request.formData()) as unknown as { get(key: string): string | null };
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const next = String(formData.get('next') ?? AUTH_CONFIG.defaultRedirect);

  if (!email) {
    return { error: 'Email is required' };
  }

  try {
    const response = await fetch(new URL('/api/auth/email-otp/send', getAuthApiBaseUrl()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: 'sign-in' }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { message?: string };
      return { error: error.message || 'Failed to send verification code' };
    }

    return redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
    );
  } catch {
    return { error: 'Failed to send verification code' };
  }
}

export default function Component() {
  const actionData = useActionData<{ error?: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? AUTH_CONFIG.defaultRedirect;

  const {
    authenticate,
    isLoading: isPasskeyLoading,
    error: passkeyError,
    isSupported: isPasskeySupported,
  } = usePasskeyAuth({ redirectTo: next });
  const callbackError = readAuthErrorMessage(new URLSearchParams(location.search));
  const resolvedError = actionData?.error ?? callbackError ?? passkeyError ?? undefined;

  return (
    <AuthScaffold title={AUTH_CONFIG.title} description={AUTH_CONFIG.description}>
      <EmailEntryForm
        action="/auth"
        {...(resolvedError ? { error: resolvedError } : {})}
        {...(isPasskeySupported
          ? {
              onPasskeyClick: async () => {
                await authenticate();
              },
            }
          : {})}
        {...(isPasskeyLoading ? { loadingMessage: 'Authenticating with passkey...' } : {})}
      />
    </AuthScaffold>
  );
}
