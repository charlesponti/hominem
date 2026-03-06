import { EmailSignIn, type EmailSignInProps } from '@hominem/ui';
import { serverEnv } from '~/lib/env';

export async function loader() {
  return null;
}

export async function action({ request }: { request: Request; formData: () => Promise<FormData> }) {
  const formData = await request.formData();
  const email = formData.get('email') as string;

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
      return { error: error.message || 'Failed to send verification email' };
    }

    return { success: true, message: 'Check your email for the verification code' };
  } catch {
    return { error: 'Failed to send verification email' };
  }
}

export default function EmailSignInPage({
  actionData,
}: {
  actionData?: EmailSignInProps['actionData'];
}) {
  return <EmailSignIn actionData={actionData} />;
}
