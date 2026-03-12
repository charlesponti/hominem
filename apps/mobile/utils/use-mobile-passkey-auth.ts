import { STEP_UP_ACTIONS } from '@hominem/auth/step-up-actions';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { authClient } from '~/lib/auth-client';
import { getPersistedSessionCookieHeader, persistSessionCookieHeader } from '~/utils/auth/session-cookie';
import { useAuth } from '~/utils/auth-provider';
import { API_BASE_URL, E2E_AUTH_SECRET, E2E_TESTING } from '~/utils/constants';

interface PasskeySignInResult {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface UseMobilePasskeyAuthReturn {
  signIn: (mode?: 'real' | 'e2e-success' | 'e2e-cancel') => Promise<PasskeySignInResult | null>;
  addPasskey: (name?: string) => Promise<{ success: boolean; error?: string }>;
  listPasskeys: () => Promise<{ id: string; name: string }[]>;
  deletePasskey: (id: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

export function useMobilePasskeyAuth(): UseMobilePasskeyAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthHeaders } = useAuth();

  // Passkeys require iOS 16+. Earlier versions and non-iOS platforms are not supported.
  const isSupported =
    Platform.OS === 'ios' && Number.parseInt(Platform.Version as string, 10) >= 16;

  const signIn = useCallback(
    async (
      mode: 'real' | 'e2e-success' | 'e2e-cancel' = 'real',
    ): Promise<PasskeySignInResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        if (E2E_TESTING && mode !== 'real') {
          if (mode === 'e2e-cancel') {
            const message = 'Passkey sign-in was cancelled';
            setError(message);
            return null;
          }

          const email = `mobile-passkey-${Date.now()}@hominem.test`;
          const response = await fetch(
            new URL('/api/auth/mobile/e2e/login', API_BASE_URL).toString(),
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-e2e-auth-secret': E2E_AUTH_SECRET,
              },
              body: JSON.stringify({
                email,
                name: 'Mobile Passkey E2E User',
                amr: ['passkey', 'e2e', 'mobile'],
              }),
            },
          );

          if (!response.ok) {
            const body = (await response.json()) as { error?: string };
            setError(body.error || 'Failed to complete E2E passkey sign-in');
            return null;
          }

          const payload = (await response.json()) as {
            access_token: string;
            refresh_token: string;
            expires_in: number;
            token_type: 'Bearer';
            user?: {
              id: string;
              email: string;
              name?: string;
            };
          };

          return {
            user: payload.user ?? {
              id: `mobile-passkey-${Date.now()}`,
              email,
              name: 'Mobile Passkey E2E User',
            },
          };
        }

        // Step 1: Sign in with passkey via Better Auth (handles native platform credential APIs).
        // On iOS this triggers the system passkey prompt. expoClient stores the
        // resulting Better Auth session in SecureStore automatically.
        const { data: passkeyData, error: passkeyError } = await authClient.signIn.passkey();

        if (passkeyError) {
          setError(passkeyError.message || 'Passkey sign-in failed');
          return null;
        }

        if (!passkeyData) {
          setError('No data returned from passkey sign-in');
          return null;
        }

        // Step 2: Resolve the Better Auth session into the normalized app session payload.
        const cookieHeader = await getPersistedSessionCookieHeader();
        const headers: Record<string, string> = {};
        if (cookieHeader) {
          headers['cookie'] = cookieHeader;
        }

        const tokenResponse = await fetch(
          new URL('/api/auth/session', API_BASE_URL).toString(),
          {
            method: 'GET',
            headers,
          },
        );

        if (!tokenResponse.ok) {
          const body = (await tokenResponse.json()) as { error?: string };
          setError(body.error || 'Failed to restore app session after passkey sign-in');
          return null;
        }

        const result = (await tokenResponse.json()) as PasskeySignInResult;

        if (cookieHeader) {
          await persistSessionCookieHeader(cookieHeader);
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Passkey sign-in failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const addPasskey = useCallback(async (name?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: passkeyError } = await authClient.passkey.addPasskey({
        name,
      });

      if (passkeyError) {
        setError(passkeyError.message || 'Failed to add passkey');
        return { success: false, error: passkeyError.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add passkey';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listPasskeys = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders();
      if (Object.keys(authHeaders).length === 0) return [];

      const response = await fetch(new URL('/api/auth/passkeys', API_BASE_URL).toString(), {
        method: 'GET',
        headers: authHeaders,
      });

      if (!response.ok) return [];

      const data = (await response.json()) as { id: string; name?: string | null }[];
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name ?? 'Unnamed passkey',
      }));
    } catch {
      return [];
    }
  }, [getAuthHeaders]);

  const deletePasskey = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        let authHeaders = await getAuthHeaders();
        if (Object.keys(authHeaders).length === 0) {
          setError('Not authenticated');
          return { success: false, error: 'Not authenticated' };
        }

        const requestDelete = async (headers: Record<string, string>) => {
          return fetch(new URL('/api/auth/passkey/delete', API_BASE_URL).toString(), {
            method: 'DELETE',
            headers: {
              'content-type': 'application/json',
              ...headers,
            },
            body: JSON.stringify({ id }),
          });
        };

        let response = await requestDelete(authHeaders);

        if (response.status === 403) {
          const body = (await response.json()) as { error?: string; action?: string };
          if (body.error === 'step_up_required' && body.action === STEP_UP_ACTIONS.PASSKEY_DELETE) {
            const stepUpResult = await signIn('real');
            if (!stepUpResult) {
              const message = 'Passkey step-up required';
              setError(message);
              return { success: false, error: message };
            }

            authHeaders = await getAuthHeaders();
            response = await requestDelete(authHeaders);
          } else {
            const message = body.error ?? 'Failed to delete passkey';
            setError(message);
            return { success: false, error: message };
          }
        }

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          const message = body.error ?? 'Failed to delete passkey';
          setError(message);
          return { success: false, error: message };
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete passkey';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthHeaders, signIn],
  );

  return {
    signIn,
    addPasskey,
    listPasskeys,
    deletePasskey,
    isLoading,
    error,
    isSupported,
  };
}
