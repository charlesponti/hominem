import {
  useRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  AppAuthStatus,
  AuthClient,
  AuthConfig,
  AuthContextType,
  HominemSession,
  HominemUser,
} from './types';
import { AuthContext } from './AuthContext'
type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

interface SessionResponse {
  isAuthenticated: boolean;
  user: HominemUser | null;
  auth?: {
    sub: string;
    sid: string;
    scope: string[];
    role: 'user' | 'admin';
    amr: string[];
    authTime: number;
  } | null;
  accessToken?: string | null;
  expiresIn?: number | null;
}

interface PublicKeyCredentialDescriptorJSON {
  type: 'public-key';
  id: string;
  transports?: AuthenticatorTransport[] | undefined;
}

interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number | undefined;
  rpId?: string | undefined;
  allowCredentials?: PublicKeyCredentialDescriptorJSON[] | undefined;
  userVerification?: UserVerificationRequirement | undefined;
}

interface PasskeyAuthOptionsResponse {
  options?: PublicKeyCredentialRequestOptionsJSON | undefined;
  challenge?: PublicKeyCredentialRequestOptionsJSON | undefined;
  [key: string]: unknown;
}

interface PasskeyRegistrationOptionsResponse {
  options?: PublicKeyCredentialCreationOptionsJSON | undefined;
  [key: string]: unknown;
}

interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout?: number | undefined;
  excludeCredentials?: Array<{
    id: string;
    type: string;
    transports?: string[] | undefined;
  }> | undefined;
  attestation?: string | undefined;
  extensions?: Record<string, unknown> | undefined;
}

interface SerializedAuthenticatorAssertionResponse {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string | null | undefined;
}

interface SerializedPublicKeyCredential {
  id: string;
  rawId: string;
  type: PublicKeyCredentialType;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  response: SerializedAuthenticatorAssertionResponse;
}

function getAbsoluteApiUrl(apiBaseUrl: string, path: string) {
  return new URL(path, apiBaseUrl).toString();
}

function toSession(accessToken?: string | null, expiresIn?: number | null): HominemSession | null {
  if (!accessToken) {
    return null;
  }

  const ttl = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 600;
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ttl,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  };
}

interface ClientAuthState {
  error: Error | null;
  isLoading: boolean;
  session: HominemSession | null;
  status: AppAuthStatus;
  user: HominemUser | null;
}

async function fetchSession(apiBaseUrl: string): Promise<SessionResponse> {
  const res = await fetch(getAbsoluteApiUrl(apiBaseUrl, '/api/auth/session'), {
    method: 'GET',
    credentials: 'include',
  });

  if (res.ok) {
    return (await res.json()) as SessionResponse;
  }

  if (res.status === 401) {
    const refreshRes = await fetch(getAbsoluteApiUrl(apiBaseUrl, '/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshRes.ok) {
      const retryRes = await fetch(getAbsoluteApiUrl(apiBaseUrl, '/api/auth/session'), {
        method: 'GET',
        credentials: 'include',
      });

      if (retryRes.ok) {
        return (await retryRes.json()) as SessionResponse;
      }
    }
  }

  return { isAuthenticated: false, user: null, accessToken: null };
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const base64 = normalized + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    const char = binary.charCodeAt(i);
    bytes[i] = char;
  }
  return bytes.buffer;
}

function normalizeRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: fromBase64Url(options.challenge),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options.rpId ? { rpId: options.rpId } : {}),
    ...(options.allowCredentials
      ? {
          allowCredentials: options.allowCredentials.map((credential) => ({
            type: 'public-key' as const,
            id: fromBase64Url(credential.id),
            ...(credential.transports ? { transports: credential.transports } : {}),
          })),
        }
      : {}),
    ...(options.userVerification ? { userVerification: options.userVerification } : {}),
  };
}

function normalizeCreationOptions(
  options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
  const result: Record<string, unknown> = {
    challenge: fromBase64Url(options.challenge),
    rp: options.rp,
    user: {
      id: fromBase64Url(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams as PublicKeyCredentialParameters[],
  };
  if (options.timeout !== undefined) {
    result.timeout = options.timeout;
  }
  if (options.excludeCredentials !== undefined) {
    result.excludeCredentials = options.excludeCredentials.map((cred) => ({
      id: fromBase64Url(cred.id),
      type: cred.type as PublicKeyCredentialType,
      ...(cred.transports ? { transports: cred.transports as AuthenticatorTransport[] } : {}),
    }));
  }
  if (options.attestation !== undefined) {
    result.attestation = options.attestation;
  }
  if (options.extensions !== undefined) {
    result.extensions = options.extensions;
  }
  return result as unknown as PublicKeyCredentialCreationOptions;
}

function serializeAssertion(credential: PublicKeyCredential): SerializedPublicKeyCredential {
  const assertionResponse = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64Url(assertionResponse.clientDataJSON),
      authenticatorData: toBase64Url(assertionResponse.authenticatorData),
      signature: toBase64Url(assertionResponse.signature),
      ...(assertionResponse.userHandle
        ? { userHandle: toBase64Url(assertionResponse.userHandle) }
        : { userHandle: null }),
    },
  };
}


export type AuthProviderProps = {
  children: ReactNode;
  config: AuthConfig;
  onAuthEvent?: (event: AuthEvent) => void;
  initialUser?: HominemUser | null;
  initialSession?: HominemSession | null;
}

export function AuthProvider({
  children,
  config,
  onAuthEvent,
  initialUser = null,
  initialSession = null,
}: AuthProviderProps) {
  const hasInitialAuth = Boolean(initialUser && initialSession);
  const previousSessionTokenRef = useRef<string | null>(initialSession?.access_token ?? null);
  const [authState, setAuthState] = useState<ClientAuthState>(() => ({
    error: null,
    isLoading: !hasInitialAuth,
    session: initialSession,
    status: hasInitialAuth ? 'signed_in' : 'booting',
    user: initialUser,
  }));

  const refreshAuth = useCallback(async () => {
    const payload = await fetchSession(config.apiBaseUrl);
    setAuthState((currentState) => {
      const nextSession = toSession(payload.accessToken, payload.expiresIn);
      const session =
        nextSession ?? (payload.isAuthenticated && payload.user ? currentState.session : null);
      const user = payload.user ?? null;

      return {
        error: null,
        isLoading: false,
        session,
        status: user && session ? 'signed_in' : 'signed_out',
        user,
      };
    });
    return payload;
  }, [config.apiBaseUrl]);

  useEffect(() => {
    if (hasInitialAuth) {
      return;
    }
    void refreshAuth();
  }, [hasInitialAuth, refreshAuth]);

  useEffect(() => {
    if (!authState.session || authState.status === 'signed_out') {
      return;
    }

    const expiresIn = authState.session.expires_in ?? 600;
    const refreshInterval = Math.max((expiresIn - 60) * 1000, 5 * 60 * 1000);

    const intervalId = setInterval(() => {
      void refreshAuth();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [authState.session, authState.status, refreshAuth]);

  const signIn = useCallback(async () => {
    // Default sign-in: redirect to email sign-in page
    window.location.href = '/auth';
  }, []);

  const signInWithEmail = useCallback(async () => {
    window.location.href = '/auth';
  }, []);

  const signInWithPasskey = useCallback(async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      throw new Error('Passkeys are not available in this environment.');
    }

    const optionsRes = await fetch(
      getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/auth/options'),
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    if (!optionsRes.ok) {
      throw new Error('Failed to request passkey authentication options.');
    }

    const optionsPayload = (await optionsRes.json()) as PasskeyAuthOptionsResponse;
    const rawOptions =
      optionsPayload.options && typeof optionsPayload.options === 'object'
        ? optionsPayload.options
        : optionsPayload.challenge && typeof optionsPayload.challenge === 'object'
          ? optionsPayload.challenge
          : null;

    if (!rawOptions || typeof rawOptions.challenge !== 'string') {
      throw new Error('Invalid passkey options response.');
    }

    const credential = (await navigator.credentials.get({
      publicKey: normalizeRequestOptions(rawOptions),
    })) as PublicKeyCredential | null;
    if (!credential) {
      throw new Error('Passkey authentication was cancelled.');
    }

    const verifyRes = await fetch(
      getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/auth/verify'),
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          response: serializeAssertion(credential),
        }),
      },
    );

    if (!verifyRes.ok) {
      throw new Error('Passkey sign-in failed.');
    }

    const tokenRes = await fetch(
      getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/token-from-session'),
      {
        method: 'POST',
        credentials: 'include',
      },
    );

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange passkey session for app tokens.');
    }

    await refreshAuth();
  }, [config.apiBaseUrl, refreshAuth]);

  const addPasskey = useCallback(
    async (name?: string) => {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error('Passkeys are not available in this environment.');
      }

      const optionsRes = await fetch(
        getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/register/options'),
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ name: name ?? 'Default Device' }),
        },
      );
      if (!optionsRes.ok) {
        throw new Error('Failed to request passkey registration options.');
      }

      const optionsPayload = (await optionsRes.json()) as PasskeyRegistrationOptionsResponse;
      const rawOptions: PublicKeyCredentialCreationOptionsJSON | null =
        optionsPayload.options && typeof optionsPayload.options === 'object'
          ? optionsPayload.options
          : null;

      if (!rawOptions || typeof rawOptions.challenge !== 'string') {
        throw new Error('Invalid passkey options response.');
      }

      const credential = (await navigator.credentials.create({
        publicKey: normalizeCreationOptions(rawOptions),
      })) as PublicKeyCredential | null;
      if (!credential) {
        throw new Error('Passkey registration was cancelled.');
      }

      const verifyRes = await fetch(
        getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/register/verify'),
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            response: serializeAssertion(credential),
            name: name ?? 'Default Device',
          }),
        },
      );

      if (!verifyRes.ok) {
        throw new Error('Passkey registration failed.');
      }
    },
    [config.apiBaseUrl],
  );

  const linkGoogle = useCallback(async () => {
    throw new Error('OAuth account linking is disabled.');
  }, []);

  const requireStepUp = useCallback(
    async (action: string) => {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error('Passkeys are not available in this environment.');
      }

      const optionsRes = await fetch(
        getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/auth/options'),
        {
          method: 'POST',
          credentials: 'include',
        },
      );
      if (!optionsRes.ok) {
        throw new Error('Failed to request passkey authentication options.');
      }

      const optionsPayload = (await optionsRes.json()) as PasskeyAuthOptionsResponse;
      const rawOptions =
        optionsPayload.options && typeof optionsPayload.options === 'object'
          ? optionsPayload.options
          : optionsPayload.challenge && typeof optionsPayload.challenge === 'object'
            ? optionsPayload.challenge
            : null;

      if (!rawOptions || typeof rawOptions.challenge !== 'string') {
        throw new Error('Invalid passkey options response.');
      }

      const credential = (await navigator.credentials.get({
        publicKey: normalizeRequestOptions(rawOptions),
      })) as PublicKeyCredential | null;
      if (!credential) {
        throw new Error('Passkey authentication was cancelled.');
      }

      const verifyRes = await fetch(
        getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/auth/verify'),
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            response: serializeAssertion(credential),
            action,
          }),
        },
      );

      if (!verifyRes.ok) {
        throw new Error('Passkey step-up verification failed.');
      }
    },
    [config.apiBaseUrl],
  );

  const unlinkGoogle = useCallback(async () => {
    throw new Error('OAuth account linking is disabled.');
  }, []);

  const signOut = useCallback(async () => {
    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isLoading: true,
      status: 'signing_out',
    }));
    await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
    setAuthState({
      error: null,
      isLoading: false,
      session: null,
      status: 'signed_out',
      user: null,
    });
    onAuthEvent?.('SIGNED_OUT');
  }, [config.apiBaseUrl, onAuthEvent]);

  const getSession = useCallback(async () => {
    if (authState.session) {
      return authState.session;
    }
    const payload = await refreshAuth();
    return toSession(payload.accessToken, payload.expiresIn);
  }, [authState.session, refreshAuth]);

  const authClient = useMemo<AuthClient>(
    () => ({
      auth: {
        signInWithOAuth: async ({ provider, options }) => {
          try {
            void provider;
            void options;
            return { error: new Error('OAuth sign-in is disabled. Use email OTP or passkey.') };
          } catch (error) {
            return { error: error instanceof Error ? error : new Error('OAuth redirect failed') };
          }
        },
        signOut: async () => {
          try {
            await signOut();
            return { error: null };
          } catch (error) {
            return { error: error instanceof Error ? error : new Error('Sign out failed') };
          }
        },
        getSession: async () => {
          try {
            const current = await getSession();
            return { data: { session: current }, error: null };
          } catch (error) {
            return {
              data: { session: null },
              error: error instanceof Error ? error : new Error('Failed to get session'),
            };
          }
        },
      },
    }),
    [getSession, signOut],
  );

  useEffect(() => {
    const currentToken = authState.session?.access_token ?? null;
    if (!currentToken) {
      previousSessionTokenRef.current = null;
      return;
    }
    if (previousSessionTokenRef.current === null) {
      previousSessionTokenRef.current = currentToken;
      return;
    }
    if (previousSessionTokenRef.current === currentToken) {
      return;
    }
    previousSessionTokenRef.current = currentToken;
    onAuthEvent?.('TOKEN_REFRESHED');
  }, [authState.session, onAuthEvent]);

  const value = useMemo<AuthContextType>(
    () => ({
      user: authState.user,
      session: authState.session,
      isLoading: authState.isLoading,
      isAuthenticated: authState.status === 'signed_in',
      signIn,
      signInWithEmail,
      signInWithPasskey,
      addPasskey,
      linkGoogle,
      unlinkGoogle,
      signOut,
      getSession,
      requireStepUp,
      logout: signOut,
      authClient,
      userId: authState.user?.id,
    }),
    [
      authState,
      signIn,
      signInWithEmail,
      signInWithPasskey,
      addPasskey,
      linkGoogle,
      unlinkGoogle,
      signOut,
      getSession,
      requireStepUp,
      authClient,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Safe access to auth context which may be null during SSR or outside the
 * provider. Use this in layout components or other places where context may not be available.
 */
export function useSafeAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}

/**
 * Strict hook that throws if no provider is found.
 */
export function useAuthContext(): AuthContextType {
  const context = useSafeAuth();
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
