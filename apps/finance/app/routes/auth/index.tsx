import { maskEmail } from '@ponti-studios/auth/shared/mask-email';
import { data, redirect, useLocation, useNavigate } from 'react-router';

import { EmailOtpAuthFlow, type EmailOtpAuthCopy } from '~/components/auth/email-otp-auth-flow';
import { getServerAuth } from '~/lib/auth.server';
import { serverEnv } from '~/lib/env';
import { useEmailOtpAuthRoute } from '~/lib/use-email-otp-auth-route';

import type { Route } from './+types/index';
import { AUTH_CONFIG } from './config';

const authCopy = {
  changeEmail: 'Use a different email',
  codeLabel: 'Verification code',
  emailHelper: 'Enter your email and we’ll send a one-time verification code.',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@example.com',
  emailTitle: 'Finance | Auth',
  otpTitle: 'Check your email',
  resend: 'Resend code',
  resendLoading: 'Sending code',
  submitEmail: 'Continue',
  submitEmailLoading: 'Sending code',
  verify: 'Verify and continue',
  verifyLoading: 'Verifying code',
} satisfies EmailOtpAuthCopy;

export const meta: Route.MetaFunction = () => [
  { title: authCopy.emailTitle },
  {
    name: 'description',
    content: authCopy.emailHelper,
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getServerAuth(request);
  if (user) {
    throw redirect(AUTH_CONFIG.defaultRedirect, { headers });
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const email = String((await request.formData()).get('email') ?? '');
  const apiBaseUrl = serverEnv.VITE_AUTH_API_URL ?? serverEnv.VITE_PUBLIC_API_URL;
  const response = await fetch(new URL('/api/auth/email-otp/send-verification-otp', apiBaseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: apiBaseUrl },
    body: JSON.stringify({ email, type: 'sign-in' }),
  });
  if (!response.ok) {
    return data({ error: 'Failed to send verification code' }, { status: 400 });
  }
  throw redirect(`/auth?email=${encodeURIComponent(email)}&step=otp`);
}

export default function AuthEntryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useEmailOtpAuthRoute({
    allowedRedirectPrefixes: AUTH_CONFIG.allowedRedirectPrefixes,
    defaultRedirect: AUTH_CONFIG.defaultRedirect,
    search: location.search,
    onNavigate: (to) => navigate(to),
  });

  return (
    <EmailOtpAuthFlow
      copy={authCopy}
      email={auth.email}
      error={auth.error ?? undefined}
      isResending={auth.isResending}
      isSubmitting={auth.isSubmitting}
      otp={auth.otp}
      otpHelperText={`We sent a verification code to ${maskEmail(auth.email)}.`}
      step={auth.step}
      onChangeEmail={auth.changeEmail}
      onEmailChange={auth.handleEmailChange}
      onEmailSubmit={() => auth.handleSendOtp()}
      onOtpChange={auth.handleOtpChange}
      onOtpSubmit={() => auth.handleVerifyOtp()}
      onResendOtp={() => auth.handleResendOtp()}
    />
  );
}
