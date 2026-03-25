import { AUTH_COPY, usePasskeyAuth } from '@hominem/auth';
import { resolveSafeAuthRedirect } from '@hominem/auth/server-utils';
import { AuthScaffold, OtpVerificationForm } from '@hominem/ui';
import { getSetCookieHeaders } from '@hominem/utils/headers';
import { redirect, useActionData, useLoaderData, useLocation, useSearchParams } from 'react-router';
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

  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return redirect('/auth');
  }

  return { email };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = (await request.formData()) as unknown as { get(key: string): string | null };
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const otp = String(formData.get('otp') ?? '').replace(/\D/g, '');
  const next = resolveSafeAuthRedirect(
    String(formData.get('next') ?? AUTH_CONFIG.defaultRedirect),
    AUTH_CONFIG.defaultRedirect,
    [...AUTH_CONFIG.allowedRedirectPrefixes],
  );

  if (!email || !otp) {
    return { error: 'Email and verification code are required.' };
  }

  const response = await fetch(new URL('/api/auth/email-otp/verify', getAuthApiBaseUrl()), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    return { error: 'Verification failed. Please check your code and try again.' };
  }

  const result = (await response.json()) as { user?: { id: string } };
  if (!result.user?.id) {
    return { error: 'Verification failed. Missing auth token from server.' };
  }

  const headers = new Headers();
  const setCookieValues = getSetCookieHeaders(response.headers);
  if (setCookieValues.length > 0) {
    for (const value of setCookieValues) {
      headers.append('set-cookie', value);
    }
  } else {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) headers.append('set-cookie', setCookie);
  }

  if (!headers.get('set-cookie')) {
    return { error: 'Verification failed. Session cookie was not set.' };
  }

  return redirect(next, { headers });
}

export default function Component() {
  const { email } = useLoaderData<{ email: string }>();
  const actionData = useActionData<{ error?: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? AUTH_CONFIG.defaultRedirect;
  const { authenticate, isSupported } = usePasskeyAuth({ redirectTo: next });

  return (
    <AuthScaffold
      title={AUTH_COPY.otpVerification.title}
      description={AUTH_COPY.otpVerification.subtitle}
    >
      <OtpVerificationForm
        action={`/auth/verify${location.search}`}
        email={email}
        defaultNext={AUTH_CONFIG.defaultRedirect}
        error={actionData?.error ?? undefined}
        {...(isSupported ? { onPasskeyClick: () => authenticate() } : {})}
        onChangeEmail={() => {
          const authUrl = new URL('/auth', window.location.origin);
          authUrl.searchParams.set('next', next);
          window.location.assign(`${authUrl.pathname}${authUrl.search}`);
        }}
      />
    </AuthScaffold>
  );
}
