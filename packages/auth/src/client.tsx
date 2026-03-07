import { type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AuthContext } from './AuthContext';
import type { AuthClient, AuthConfig, AuthContextType, HominemSession, HominemUser } from './types';
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
  excludeCredentials?:
    | Array<{
        id: string;
        type: string;
        transports?: string[] | undefined;
      }>
    | undefined;
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

async function fetchSession(apiBaseUrl: string): Promise<SessionResponse> {
  const res = await fetch(getAbsoluteApiUrl(apiBaseUrl, '/api/auth/session'), {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    return { isAuthenticated: false, user: null, accessToken: null };
  }

  return (await res.json()) as SessionResponse;
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
};

export function AuthProvider({ children, config, onAuthEvent }: AuthProviderProps) {
  const [session, setSession] = useState<HominemSession | null>(null);
  const [user, setUser] = useState<HominemUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const payload = await fetchSession(config.apiBaseUrl);
    setUser(payload.user ?? null);
    setSession(toSession(payload.accessToken, payload.expiresIn));
    setIsLoading(false);
    return payload;
  }, [config.apiBaseUrl]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

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
    await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setSession(null);
    onAuthEvent?.('SIGNED_OUT');
  }, [config.apiBaseUrl, onAuthEvent]);

  const getSession = useCallback(async () => {
    const payload = await refreshAuth();
    return toSession(payload.accessToken, payload.expiresIn);
  }, [refreshAuth]);

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
    if (!session) {
      return;
    }
    onAuthEvent?.('TOKEN_REFRESHED');
  }, [onAuthEvent, session]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: Boolean(user && session),
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
      userId: user?.id,
    }),
    [
      user,
      session,
      isLoading,
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
