import { AUTH_COPY, readAuthErrorMessage } from '@hominem/auth';
import { useActionData, useLoaderData, useLocation } from 'react-router';

import { usePasskeyAuth } from '../../hooks/use-passkey-auth';
import { AuthScaffold } from './auth-scaffold';
import { EmailEntryForm } from './email-entry-form';
import { OtpVerificationForm } from './otp-verification-form';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null | undefined;
}

export interface AuthLoaderResult {
  headers: Headers;
  user: AuthUser | null;
}

interface VerifySuccessPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: { id: string; email: string; name?: string | null };
}

interface PasskeyCallbackPayload {
  accessToken: string;
  next?: string;
}

interface EmailOtpErrorPayload {
  message?: string;
}

interface AuthActionData {
  error?: string;
}

interface AuthVerifyLoaderData {
  email: string;
}

export type GetServerAuth = (request: Request) => Promise<AuthLoaderResult>;

interface SharedAuthRouteConfig {
  apiBaseUrl: string;
  defaultRedirect: string;
}

export interface AuthEntryRouteConfig extends SharedAuthRouteConfig {
  title: string;
  description: string;
}

export interface AuthVerifyRouteConfig extends SharedAuthRouteConfig {
  allowedRedirectPrefixes: readonly string[];
}

export interface AuthLogoutRouteConfig {
  apiBaseUrl: string;
}

export interface AuthPasskeyCallbackRouteConfig {
  allowedRedirectPrefixes: readonly string[];
  defaultRedirect: string;
}

export function createAuthEntryComponent(config: AuthEntryRouteConfig) {
  return function Component() {
    const actionData = useActionData<AuthActionData>();
    const location = useLocation();
    const {
      authenticate,
      isLoading: isPasskeyLoading,
      error: passkeyError,
      isSupported: isPasskeySupported,
    } = usePasskeyAuth({ redirectTo: config.defaultRedirect });
    const callbackError = readAuthErrorMessage(new URLSearchParams(location.search));
    const resolvedError = actionData?.error ?? callbackError ?? passkeyError ?? undefined;

    const handlePasskeyAuth = async () => {
      await authenticate();
    };

    const emailEntryProps = {
      action: '/auth',
      ...(resolvedError ? { error: resolvedError } : {}),
      ...(isPasskeySupported ? { onPasskeyClick: handlePasskeyAuth } : {}),
      ...(isPasskeyLoading ? { loadingMessage: 'Authenticating with passkey...' } : {}),
    };

    return (
      <AuthScaffold title={config.title} description={config.description}>
        <EmailEntryForm {...emailEntryProps} />
      </AuthScaffold>
    );
  };
}

export function createAuthVerifyComponent(config: AuthVerifyRouteConfig) {
  return function Component() {
    const { email } = useLoaderData<AuthVerifyLoaderData>();
    const actionData = useActionData<AuthActionData>();
    const location = useLocation();

    return (
      <AuthScaffold title={AUTH_COPY.otpVerification.title} description={AUTH_COPY.otpVerification.subtitle}>
        <OtpVerificationForm
          action={`/auth/verify${location.search}`}
          email={email}
          defaultNext={config.defaultRedirect}
          error={actionData?.error ?? undefined}
          onChangeEmail={() => {
            window.location.href = '/auth';
          }}
        />
      </AuthScaffold>
    );
  };
}
