import type { User } from '@hominem/auth';
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

import { captureAuthAnalyticsEvent, captureAuthAnalyticsFailure } from './auth/auth-analytics';
import { markAuthPhaseStart, recordAuthEvent } from './auth/auth-event-log';
import { runAuthBoot } from './auth/boot';
import { resolveIsLoadingAuth, type AuthStatusCompat } from './auth/provider-utils';
import {
  clearPersistedSessionCookies,
  getPersistedSessionCookieHeader,
  persistSessionCookieFromHeaders,
  persistSessionCookieHeader,
} from './auth/session-cookie';
import { authStateMachine, initialAuthState, type AuthState } from './auth/types';
import { API_BASE_URL, E2E_TESTING } from './constants';
import { LocalStore } from './local-store';
import { markStartupPhase } from './performance/startup-metrics';

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1';
const OTP_REQUEST_TIMEOUT_MS = 12000;
const OTP_VERIFY_TIMEOUT_MS = 20000;
const AUTH_BOOT_TIMEOUT_MS = 8000;

interface SignInResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

interface SessionResponse {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
}

function hasValidSignInResponse(input: SignInResponse) {
  return input.user.id.length > 0 && input.user.email.length > 0;
}

function toAuthUserProfile(localProfile: User | null): AuthState['user'] {
  if (!localProfile) return null;
  return {
    id: localProfile.id,
    email: localProfile.email,
    name: localProfile.name,
    image: localProfile.image,
    isAdmin: localProfile.isAdmin,
    createdAt: localProfile.createdAt,
    updatedAt: localProfile.updatedAt,
  } as AuthState['user'];
}

function fromSignInUser(user: { id: string; email: string; name?: string | null }): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    image: undefined,
    isAdmin: false,
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
  authError: Error | null;
  isLoadingAuth: boolean;
  isSignedIn: boolean;
  currentUser: User | null;
  requestEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (input: { email: string; otp: string; name?: string }) => Promise<void>;
  completePasskeySignIn: (input: SignInResponse) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  clearError: () => void;
  retrySessionRecovery: () => Promise<void>;
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
  const sessionCookieHeaderRef = useRef<string | null>(null);
  const hasBootstrappedRef = useRef(false);
  // Set synchronously before first await to prevent TOCTOU race on concurrent boot invocations
  const isBootingRef = useRef(false);

  const bootSession = useCallback(async (input?: { force?: boolean; signal?: AbortSignal }) => {
    if ((!input?.force && hasBootstrappedRef.current) || isBootingRef.current) return;
    isBootingRef.current = true;
    if (input?.force) {
      hasBootstrappedRef.current = false;
    }

    const startedAt = Date.now();

    markStartupPhase('auth_boot_start');
    markAuthPhaseStart('boot');
    recordAuthEvent('auth_boot_start', 'boot');
    captureAuthAnalyticsEvent('auth_boot_started', {
      phase: 'boot',
    });

    const controller = new AbortController();
    const signal = input?.signal ?? controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), AUTH_BOOT_TIMEOUT_MS);

    try {
      const result = await runAuthBoot({
        getStoredTokens: async () => {
          const sessionCookieHeader = await getPersistedSessionCookieHeader();
          return { sessionCookieHeader };
        },
        probeSession: async ({ sessionCookieHeader, signal: sig }) => {
          const headers: Record<string, string> = {};
          if (sessionCookieHeader) {
            headers.cookie = sessionCookieHeader;
          }

          const response = await fetch(new URL('/api/auth/session', API_BASE_URL).toString(), {
            method: 'GET',
            headers,
            signal: sig,
          });
          if (response.ok) {
            const data = (await response.json()) as SessionResponse;
            if (data.isAuthenticated && data.user) {
              return { user: data.user };
            }
            return null;
          }
          if (response.status === 401) return null;
          throw new Error(`session probe failed: ${response.status}`);
        },
        clearTokens: async () => {
          await clearPersistedSessionCookies();
          sessionCookieHeaderRef.current = null;
        },
        upsertProfile: async (user) => {
          const saved = await LocalStore.upsertUserProfile(fromSignInUser(user));
          return toAuthUserProfile(saved);
        },
        clearLegacyData: clearLegacyLocalDataOnce,
        signal,
      });

      if (result.type === 'SESSION_LOADED') {
        sessionCookieHeaderRef.current = result.tokens.sessionCookieHeader;
        dispatch({ type: 'SESSION_LOADED', user: result.user });
        recordAuthEvent('auth_boot_resolved:session_loaded', 'boot');
        captureAuthAnalyticsEvent('auth_boot_succeeded', {
          phase: 'boot',
          durationMs: Date.now() - startedAt,
          email: result.user.email,
        });
      } else {
        dispatch({ type: 'SESSION_EXPIRED' });
        recordAuthEvent('auth_boot_resolved:session_expired', 'boot');
        captureAuthAnalyticsEvent('auth_boot_signed_out', {
          phase: 'boot',
          durationMs: Date.now() - startedAt,
        });
      }

      markStartupPhase('auth_boot_resolved');
      hasBootstrappedRef.current = true;
    } catch (error) {
      const resolvedError =
        error instanceof Error ? error : new Error('Unable to recover your session right now.');
      dispatch({ type: 'SESSION_RECOVERY_FAILED', error: resolvedError });
      recordAuthEvent('auth_boot_resolved:error', 'boot');
      captureAuthAnalyticsFailure('auth_boot_failed', {
        phase: 'boot',
        durationMs: Date.now() - startedAt,
        error: resolvedError,
        failureStage: 'network',
      });
      markStartupPhase('auth_boot_resolved');
      hasBootstrappedRef.current = true;
    } finally {
      clearTimeout(timeoutId);
      isBootingRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    void bootSession({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [bootSession]);

  const requestEmailOtp = useCallback(async (email: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OTP_REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();

    dispatch({ type: 'OTP_REQUEST_STARTED' });
    captureAuthAnalyticsEvent('auth_email_otp_request_started', {
      phase: 'email_otp_request',
      email,
    });

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
      captureAuthAnalyticsFailure('auth_email_otp_request_failed', {
        phase: 'email_otp_request',
        durationMs: Date.now() - startedAt,
        email,
        error: resolvedError,
        failureStage: 'network',
      });
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
      captureAuthAnalyticsFailure('auth_email_otp_request_failed', {
        phase: 'email_otp_request',
        durationMs: Date.now() - startedAt,
        email,
        error,
        failureStage: 'response',
        statusCode: response.status,
      });
      throw error;
    }

    dispatch({ type: 'OTP_REQUESTED' });
    captureAuthAnalyticsEvent('auth_email_otp_request_succeeded', {
      phase: 'email_otp_request',
      durationMs: Date.now() - startedAt,
      email,
      statusCode: response.status,
    });
  }, []);

  const verifyEmailOtp = useCallback(
    async (input: { email: string; otp: string; name?: string }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OTP_VERIFY_TIMEOUT_MS);
      const startedAt = Date.now();

      dispatch({ type: 'OTP_VERIFICATION_STARTED' });
      captureAuthAnalyticsEvent('auth_email_otp_verify_started', {
        phase: 'email_otp_verify',
        email: input.email,
      });

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

        const sessionCookieHeader = await persistSessionCookieFromHeaders(response.headers);
        if (!sessionCookieHeader) {
          throw new Error('Verification succeeded but no session cookie was returned');
        }
        sessionCookieHeaderRef.current = sessionCookieHeader;

        dispatch({ type: 'PROFILE_SYNC_STARTED' });
        const localUser = fromSignInUser(signInData.user);
        const saved = await LocalStore.upsertUserProfile(localUser);
        const userProfile = toAuthUserProfile(saved);
        if (!userProfile) throw new Error('Failed to create user profile');

        dispatch({ type: 'SESSION_LOADED', user: userProfile });
        captureAuthAnalyticsEvent('auth_email_otp_verify_succeeded', {
          phase: 'email_otp_verify',
          durationMs: Date.now() - startedAt,
          email: input.email,
          statusCode: response.status,
        });
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Sign-in failed');
        dispatch({ type: 'OTP_VERIFICATION_FAILED', error: resolvedError });
        captureAuthAnalyticsFailure('auth_email_otp_verify_failed', {
          phase: 'email_otp_verify',
          durationMs: Date.now() - startedAt,
          email: input.email,
          error: resolvedError,
          failureStage: 'unknown',
        });
        throw resolvedError;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [],
  );

  const completePasskeySignIn = useCallback(async (input: SignInResponse) => {
    const startedAt = Date.now();

    dispatch({ type: 'PASSKEY_AUTH_STARTED' });
    captureAuthAnalyticsEvent('auth_passkey_sign_in_started', {
      phase: 'passkey_sign_in',
      email: input.user.email,
    });

    try {
      if (!hasValidSignInResponse(input)) {
        throw new Error('Invalid passkey sign-in response from API');
      }

      const sessionCookieHeader = await getPersistedSessionCookieHeader();
      if (!sessionCookieHeader) {
        throw new Error('Missing Better Auth session cookie after passkey sign-in');
      }

      sessionCookieHeaderRef.current = sessionCookieHeader;
      await persistSessionCookieHeader(sessionCookieHeader);

      dispatch({ type: 'PROFILE_SYNC_STARTED' });
      const localUser = fromSignInUser(input.user);
      const saved = await LocalStore.upsertUserProfile(localUser);
      const userProfile = toAuthUserProfile(saved);
      if (!userProfile) throw new Error('Failed to create passkey user profile');

      dispatch({ type: 'SESSION_LOADED', user: userProfile });
      captureAuthAnalyticsEvent('auth_passkey_sign_in_succeeded', {
        phase: 'passkey_sign_in',
        durationMs: Date.now() - startedAt,
        email: input.user.email,
      });
    } catch (error) {
      const resolvedError = error instanceof Error ? error : new Error('Passkey sign-in failed');
      dispatch({ type: 'PASSKEY_AUTH_FAILED', error: resolvedError });
      captureAuthAnalyticsFailure('auth_passkey_sign_in_failed', {
        phase: 'passkey_sign_in',
        durationMs: Date.now() - startedAt,
        email: input.user.email,
        error: resolvedError,
        failureStage: 'storage',
      });
      throw resolvedError;
    }
  }, []);

  const signOut = useCallback(async () => {
    const startedAt = Date.now();

    dispatch({ type: 'SIGN_OUT_REQUESTED' });
    captureAuthAnalyticsEvent('auth_sign_out_started', {
      phase: 'sign_out',
      email: state.user?.email ?? undefined,
    });

    try {
      const sessionCookieHeader = sessionCookieHeaderRef.current;
      if (!sessionCookieHeader) {
        throw new Error('Missing Better Auth session for sign-out. Please try again.');
      }

      const response = await fetch(new URL('/api/auth/logout', API_BASE_URL).toString(), {
        method: 'POST',
        headers: { cookie: sessionCookieHeader },
      });

      if (!response.ok) {
        throw new Error('Failed to sign out. Please try again.');
      }

      await clearPersistedSessionCookies();
      sessionCookieHeaderRef.current = null;
      await LocalStore.clearAllData();
      dispatch({ type: 'SIGN_OUT_SUCCESS' });
      captureAuthAnalyticsEvent('auth_sign_out_succeeded', {
        phase: 'sign_out',
        durationMs: Date.now() - startedAt,
        email: state.user?.email ?? undefined,
        statusCode: response.status,
      });
    } catch (error) {
      const resolvedError =
        error instanceof Error ? error : new Error('Failed to sign out. Please try again.');
      dispatch({ type: 'FATAL_ERROR', error: resolvedError });
      captureAuthAnalyticsFailure('auth_sign_out_failed', {
        phase: 'sign_out',
        durationMs: Date.now() - startedAt,
        email: state.user?.email ?? undefined,
        error: resolvedError,
        failureStage: 'network',
      });
      throw resolvedError;
    }
  }, [state.user?.email]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const current = await LocalStore.getUserProfile();
    if (!current) throw new Error('No user profile to update');

    const merged: User = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const saved = await LocalStore.upsertUserProfile(merged);
    if (!saved) throw new Error('Failed to update profile');

    return saved;
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const sessionCookieHeader =
      sessionCookieHeaderRef.current ?? (await getPersistedSessionCookieHeader());
    if (sessionCookieHeader) {
      sessionCookieHeaderRef.current = sessionCookieHeader;
      return { cookie: sessionCookieHeader } satisfies Record<string, string>;
    }

    return {} as Record<string, string>;
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetAuthForE2E = useCallback(async () => {
    if (!E2E_TESTING) return;
    await LocalStore.clearAllData();
    await clearPersistedSessionCookies();
    sessionCookieHeaderRef.current = null;
    dispatch({ type: 'RESET_TO_SIGNED_OUT' });
    hasBootstrappedRef.current = false;
    isBootingRef.current = false;
  }, []);

  const authStatus = state.status;
  const authError = state.error;
  const isLoadingAuth = useMemo(() => resolveIsLoadingAuth(state), [state]);
  const isSignedIn = state.status === 'signed_in';
  const currentUser = useMemo(() => {
    if (!state.user) return null;
    return {
      id: state.user.id,
      email: state.user.email,
      name: state.user.name,
      image: state.user.image,
      isAdmin: state.user.isAdmin,
      createdAt: state.user.createdAt,
      updatedAt: state.user.updatedAt,
    };
  }, [state.user]);

  const value: AuthContextType = {
    authStatus,
    authError,
    isLoadingAuth,
    isSignedIn,
    currentUser,
    requestEmailOtp,
    verifyEmailOtp,
    completePasskeySignIn,
    signOut,
    updateProfile,
    getAuthHeaders,
    clearError,
    retrySessionRecovery: async () => {
      dispatch({ type: 'CLEAR_ERROR' });
      captureAuthAnalyticsEvent('auth_session_recovery_requested', {
        phase: 'session_recovery',
        email: state.user?.email ?? undefined,
      });
      await bootSession({ force: true });
    },
    resetAuthForE2E,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
