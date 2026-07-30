import { maskEmail } from '@ponti-studios/auth/shared/mask-email';
import { redirect, useLocation, useNavigate } from 'react-router';

import { EmailOtpAuthFlow, type EmailOtpAuthCopy } from '~/components/auth/email-otp-auth-flow';
import { userContext } from '~/lib/middleware';
import { useEmailOtpAuthRoute } from '~/lib/use-email-otp-auth-route';

import { Route } from './+types/index';
import { AUTH_CONFIG } from './config';

const authCopy = {
  changeEmail: 'Use a different email',
  codeLabel: 'Verification code',
  emailHelper: 'Enter your email to receive the one-time code.',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@example.com',
  emailTitle: 'Auth',
  otpTitle: 'Check your email',
  resend: 'Resend code',
  resendLoading: 'Sending code',
  submitEmail: 'Continue',
  submitEmailLoading: 'Sending code',
  verify: 'Verify',
  verifyLoading: 'Verifying',
} satisfies EmailOtpAuthCopy;

export const meta: Route.MetaFunction = () => [
  { title: authCopy.emailTitle },
  {
    name: 'description',
    content: authCopy.emailHelper,
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);

  if (user) {
    throw redirect(AUTH_CONFIG.defaultRedirect);
  }
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
