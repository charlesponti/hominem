import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type PropsWithChildren,
} from 'react';

import { markAuthPhaseStart, recordAuthEvent } from './auth/auth-event-log';
import { runAuthBoot } from './auth/boot';
import { resolveIsLoadingAuth, type AuthStatusCompat } from './auth/provider-utils';
import { runSingleflight } from './auth/singleflight';
import { authStateMachine, initialAuthState, type AuthState } from './auth/types';
import { API_BASE_URL, E2E_TESTING } from './constants';
import { LocalStore } from './local-store';
import type { UserProfile as LocalUserProfile } from './local-store/types';
import { markStartupPhase } from './performance/startup-metrics';

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1';
const API_ACCESS_TOKEN_KEY = 'hominem_mobile_api_access_token_v1';
const API_REFRESH_TOKEN_KEY = 'hominem_mobile_api_refresh_token_v1';
const API_EXPIRES_AT_KEY = 'hominem_mobile_api_expires_at_v1';
const OTP_REQUEST_TIMEOUT_MS = 12000;
const OTP_VERIFY_TIMEOUT_MS = 20000;
const AUTH_BOOT_TIMEOUT_MS = 8000;
const TOKEN_REFRESH_BUFFER_MS = 60_000;

interface SignInResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface SessionResponse {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

function hasValidSignInResponse(input: SignInResponse) {
  return (
    input.accessToken.length > 0 &&
    input.refreshToken.length > 0 &&
    input.expiresIn > 0 &&
    input.user.id.length > 0 &&
    input.user.email.length > 0
  );
}

function toAuthUserProfile(localProfile: LocalUserProfile | null): AuthState['user'] {
  if (!localProfile) return null;
  return {
    id: localProfile.id,
    email: localProfile.email ?? null,
    name: localProfile.name ?? null,
    createdAt: localProfile.createdAt,
    updatedAt: localProfile.updatedAt,
  } as AuthState['user'];
}

function fromSignInUser(user: {
  id: string;
  email: string;
  name?: string | null;
}): LocalUserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function clearLegacyLocalDataOnce() {
  const migrationFlag = await SecureStore.getItemAsync(LOCAL_MIGRATION_KEY);
  if (migrationFlag === '1') return;
  await LocalStore.clearAllData();
  await SecureStore.setItemAsync(LOCAL_MIGRATION_KEY, '1');
}

type AuthContextType = {
  authStatus: AuthStatusCompat;
  isLoadingAuth: boolean;
  isSignedIn: boolean;
  currentUser: LocalUserProfile | null;
  requestEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (input: { email: string; otp: string; name?: string }) => Promise<void>;
  completePasskeySignIn: (input: SignInResponse) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<LocalUserProfile>) => Promise<LocalUserProfile>;
  getAccessToken: () => Promise<string | null>;
  clearError: () => void;
  resetAuthForE2E: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(authStateMachine, initialAuthState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const apiAccessTokenRef = useRef<string | null>(null);
  const apiRefreshTokenRef = useRef<string | null>(null);
  const apiExpiresAtRef = useRef<number | null>(null);
  const refreshRequestRef = useRef<Promise<string | null> | null>(null);
  const hasBootstrappedRef = useRef(false);
  // Set synchronously before first await to prevent TOCTOU race on concurrent boot invocations
  const isBootingRef = useRef(false);

  const setApiTokens = useCallback(
    async (accessToken: string | null, refreshToken: string | null, expiresIn?: number) => {
      apiAccessTokenRef.current = accessToken;
      apiRefreshTokenRef.current = refreshToken;
      apiExpiresAtRef.current = expiresIn != null ? Date.now() + expiresIn * 1000 : null;

      if (accessToken && refreshToken) {
        const expiresAt = apiExpiresAtRef.current;
        await Promise.all([
          SecureStore.setItemAsync(API_ACCESS_TOKEN_KEY, accessToken),
          SecureStore.setItemAsync(API_REFRESH_TOKEN_KEY, refreshToken),
          expiresAt != null
            ? SecureStore.setItemAsync(API_EXPIRES_AT_KEY, String(expiresAt))
            : SecureStore.deleteItemAsync(API_EXPIRES_AT_KEY),
        ]);
        return;
      }

      await Promise.all([
        SecureStore.deleteItemAsync(API_ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(API_REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(API_EXPIRES_AT_KEY),
      ]);
    },
    [],
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const bootSession = async () => {
      // Synchronous double-check prevents concurrent boot invocations
      if (hasBootstrappedRef.current || isBootingRef.current) return;
      isBootingRef.current = true;

      markStartupPhase('auth_boot_start');
      markAuthPhaseStart('boot');
      recordAuthEvent('auth_boot_start', 'boot');

      const timeoutId = setTimeout(() => controller.abort(), AUTH_BOOT_TIMEOUT_MS);

      try {
        const result = await runAuthBoot({
          getStoredTokens: async () => {
            const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
              SecureStore.getItemAsync(API_ACCESS_TOKEN_KEY),
              SecureStore.getItemAsync(API_REFRESH_TOKEN_KEY),
              SecureStore.getItemAsync(API_EXPIRES_AT_KEY),
            ]);
            return { accessToken, refreshToken, expiresAtStr };
          },
          probeSession: async (token, sig) => {
            const response = await fetch(new URL('/api/auth/session', API_BASE_URL).toString(), {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` },
              signal: sig,
            });
            if (response.ok) {
              const data = (await response.json()) as SessionResponse;
              return data.isAuthenticated && data.user ? data.user : null;
            }
            if (response.status === 401) return null;
            throw new Error(`session probe failed: ${response.status}`);
          },
          clearTokens: () => setApiTokens(null, null),
          upsertProfile: async (user) => {
            const saved = await LocalStore.upsertUserProfile(fromSignInUser(user));
            return toAuthUserProfile(saved);
          },
          clearLegacyData: clearLegacyLocalDataOnce,
          signal,
        });

        if (result.type === 'SESSION_LOADED') {
          apiAccessTokenRef.current = result.tokens.accessToken;
          apiRefreshTokenRef.current = result.tokens.refreshToken;
          apiExpiresAtRef.current = result.tokens.expiresAtStr
            ? Number(result.tokens.expiresAtStr)
            : null;
          dispatch({ type: 'SESSION_LOADED', user: result.user });
          recordAuthEvent('auth_boot_resolved:session_loaded', 'boot');
        } else {
          dispatch({ type: 'SESSION_EXPIRED' });
          recordAuthEvent('auth_boot_resolved:session_expired', 'boot');
        }

        markStartupPhase('auth_boot_resolved');
        hasBootstrappedRef.current = true;
      } catch {
        // Handles timeout (AbortError), network errors, and unexpected throws.
        // Always resolve boot to a stable state so the app never hangs.
        if (!hasBootstrappedRef.current) {
          dispatch({ type: 'SESSION_EXPIRED' });
          recordAuthEvent('auth_boot_resolved:error', 'boot');
          markStartupPhase('auth_boot_resolved');
          hasBootstrappedRef.current = true;
        }
      } finally {
        clearTimeout(timeoutId);
        isBootingRef.current = false;
      }
    };

    void bootSession();

    return () => {
      controller.abort();
    };
  }, [setApiTokens]);

  const requestEmailOtp = useCallback(async (email: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OTP_REQUEST_TIMEOUT_MS);

    dispatch({ type: 'OTP_REQUEST_STARTED' });

    let response: Response;
    try {
      response = await fetch(new URL('/api/auth/email-otp/send', API_BASE_URL).toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, type: 'sign-in' }),
        signal: controller.signal,
      });
    } catch (error) {
      const resolvedError =
        error instanceof Error && error.name === 'AbortError'
          ? new Error('Request timed out. Please try again.')
          : error instanceof Error
            ? error
            : new Error('Unable to send verification code.');
      dispatch({ type: 'OTP_REQUEST_FAILED', error: resolvedError });
      throw resolvedError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let message = 'Unable to send verification code.';
      try {
        const payload = (await response.json()) as { message?: string; error?: string };
        message = payload.message ?? payload.error ?? message;
      } catch {}
      const error = new Error(message);
      dispatch({ type: 'OTP_REQUEST_FAILED', error });
      throw error;
    }

    dispatch({ type: 'OTP_REQUESTED' });
  }, []);

  const verifyEmailOtp = useCallback(
    async (input: { email: string; otp: string; name?: string }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OTP_VERIFY_TIMEOUT_MS);

      dispatch({ type: 'OTP_VERIFICATION_STARTED' });

      try {
        const response = await fetch(
          new URL('/api/auth/email-otp/verify', API_BASE_URL).toString(),
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: input.email, otp: input.otp, name: input.name }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          let message = 'Verification failed. Please try again.';
          try {
            const payload = (await response.json()) as { message?: string; error?: string };
            message = payload.message ?? payload.error ?? message;
          } catch {}
          throw new Error(message);
        }

        const signInData = (await response.json()) as SignInResponse;

        if (!hasValidSignInResponse(signInData)) {
          throw new Error('Invalid sign-in response from API');
        }

        dispatch({ type: 'API_TOKEN_MINT_STARTED' });
        await setApiTokens(signInData.accessToken, signInData.refreshToken, signInData.expiresIn);

        dispatch({ type: 'PROFILE_SYNC_STARTED' });
        const localUser = fromSignInUser(signInData.user);
        const saved = await LocalStore.upsertUserProfile(localUser);
        const userProfile = toAuthUserProfile(saved);
        if (!userProfile) throw new Error('Failed to create user profile');

        dispatch({ type: 'SESSION_LOADED', user: userProfile });
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Sign-in failed');
        dispatch({ type: 'OTP_VERIFICATION_FAILED', error: resolvedError });
        throw resolvedError;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [setApiTokens],
  );

  const completePasskeySignIn = useCallback(
    async (input: SignInResponse) => {
      dispatch({ type: 'PASSKEY_AUTH_STARTED' });

      try {
        if (!hasValidSignInResponse(input)) {
          throw new Error('Invalid passkey sign-in response from API');
        }

        await setApiTokens(input.accessToken, input.refreshToken, input.expiresIn);

        dispatch({ type: 'PROFILE_SYNC_STARTED' });
        const localUser = fromSignInUser(input.user);
        const saved = await LocalStore.upsertUserProfile(localUser);
        const userProfile = toAuthUserProfile(saved);
        if (!userProfile) throw new Error('Failed to create passkey user profile');

        dispatch({ type: 'SESSION_LOADED', user: userProfile });
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Passkey sign-in failed');
        dispatch({ type: 'PASSKEY_AUTH_FAILED', error: resolvedError });
        throw resolvedError;
      }
    },
    [setApiTokens],
  );

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = apiRefreshTokenRef.current;
    if (!refreshToken) {
      return null;
    }

    if (refreshRequestRef.current) {
      return refreshRequestRef.current;
    }

    return runSingleflight(refreshRequestRef, async () => {
      dispatch({ type: 'REFRESH_STARTED' });
      try {
        const response = await fetch(new URL('/api/auth/refresh', API_BASE_URL).toString(), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          await setApiTokens(null, null);
          dispatch({ type: 'REFRESH_FAILED', error: new Error('Token refresh failed') });
          return null;
        }

        const data = (await response.json()) as RefreshResponse;
        await setApiTokens(data.accessToken, data.refreshToken, data.expiresIn);
        const profile = await LocalStore.getUserProfile();
        const userProfile = toAuthUserProfile(profile);
        if (userProfile) {
          dispatch({ type: 'SESSION_LOADED', user: userProfile });
        }
        return data.accessToken;
      } catch (error) {
        await setApiTokens(null, null);
        dispatch({
          type: 'REFRESH_FAILED',
          error: error instanceof Error ? error : new Error('Token refresh failed'),
        });
        return null;
      }
    });
  }, [setApiTokens]);

  const signOut = useCallback(async () => {
    dispatch({ type: 'SIGN_OUT_REQUESTED' });

    try {
      const accessToken = apiAccessTokenRef.current;
      if (accessToken) {
        await fetch(new URL('/api/auth/logout', API_BASE_URL).toString(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {
          // Best-effort server revocation — clear locally regardless
        });
      }
    } finally {
      await setApiTokens(null, null);
      await LocalStore.clearAllData();
      dispatch({ type: 'SIGN_OUT_SUCCESS' });
    }
  }, [setApiTokens]);

  const updateProfile = useCallback(async (updates: Partial<LocalUserProfile>) => {
    const current = await LocalStore.getUserProfile();
    if (!current) throw new Error('No user profile to update');

    const merged: LocalUserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const saved = await LocalStore.upsertUserProfile(merged);
    if (!saved) throw new Error('Failed to update profile');

    return saved;
  }, []);

  const getAccessToken = useCallback(async () => {
    const token = apiAccessTokenRef.current;
    if (!token) return null;

    const expiresAt = apiExpiresAtRef.current;
    if (expiresAt != null && Date.now() + TOKEN_REFRESH_BUFFER_MS > expiresAt) {
      return refreshAccessToken();
    }

    return token;
  }, [refreshAccessToken]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetAuthForE2E = useCallback(async () => {
    if (!E2E_TESTING) return;
    await LocalStore.clearAllData();
    await setApiTokens(null, null);
    dispatch({ type: 'RESET_TO_SIGNED_OUT' });
    hasBootstrappedRef.current = false;
    isBootingRef.current = false;
  }, [setApiTokens]);

  const authStatus = state.status;
  const isLoadingAuth = useMemo(() => resolveIsLoadingAuth(state), [state]);
  const isSignedIn = state.status === 'signed_in';
  const currentUser = useMemo(() => {
    if (!state.user) return null;
    return {
      id: state.user.id,
      email: state.user.email,
      name: state.user.name,
      createdAt: state.user.createdAt,
      updatedAt: state.user.updatedAt,
    };
  }, [state.user]);

  const value: AuthContextType = {
    authStatus,
    isLoadingAuth,
    isSignedIn,
    currentUser,
    requestEmailOtp,
    verifyEmailOtp,
    completePasskeySignIn,
    signOut,
    updateProfile,
    getAccessToken,
    clearError,
    resetAuthForE2E,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
