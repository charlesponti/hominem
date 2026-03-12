import { AUTH_COPY, readAuthErrorMessage } from '@hominem/auth';
import { useActionData, useLoaderData, useLocation, useSearchParams } from 'react-router';

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

interface AuthActionData {
  error?: string;
}

interface AuthVerifyLoaderData {
  email: string;
}

export type GetServerAuth = (request: Request) => Promise<AuthLoaderResult>;
export type GetAuthApiBaseUrl = () => string;

interface SharedAuthComponentConfig {
  allowedRedirectPrefixes: readonly string[];
  defaultRedirect: string;
}

export interface AuthEntryRouteConfig extends SharedAuthComponentConfig {
  title: string;
  description: string;
}

export interface AuthVerifyRouteConfig extends SharedAuthComponentConfig {
  allowedRedirectPrefixes: readonly string[];
}

export interface AuthLogoutRouteConfig {
  getApiBaseUrl: GetAuthApiBaseUrl;
}

export interface AuthPasskeyCallbackRouteConfig {
  allowedRedirectPrefixes: readonly string[];
  defaultRedirect: string;
}

export interface AuthEntryServerRouteConfig extends AuthEntryRouteConfig {
  getApiBaseUrl: GetAuthApiBaseUrl;
}

export interface AuthVerifyServerRouteConfig extends AuthVerifyRouteConfig {
  getApiBaseUrl: GetAuthApiBaseUrl;
}

export function createAuthEntryComponent(config: AuthEntryRouteConfig) {
  return function Component() {
    const actionData = useActionData<AuthActionData>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const next = searchParams.get('next') ?? config.defaultRedirect;
    const {
      authenticate,
      isLoading: isPasskeyLoading,
      error: passkeyError,
      isSupported: isPasskeySupported,
    } = usePasskeyAuth({ redirectTo: next });
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
    const [searchParams] = useSearchParams();
    const next = searchParams.get('next') ?? config.defaultRedirect;
    const { authenticate, isSupported } = usePasskeyAuth({ redirectTo: next });

    return (
      <AuthScaffold
        title={AUTH_COPY.otpVerification.title}
        description={AUTH_COPY.otpVerification.subtitle}
      >
        <OtpVerificationForm
          action={`/auth/verify${location.search}`}
          email={email}
          defaultNext={config.defaultRedirect}
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
  };
}
