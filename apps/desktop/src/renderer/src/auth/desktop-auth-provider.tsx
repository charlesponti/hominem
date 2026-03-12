import {
  appAuthStateMachine,
  initialAppAuthState,
  type AppAuthState,
  type HominemSession,
} from '@hominem/auth/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { desktopEnv } from '../lib/env';
import {
  bootstrapSession,
  isPasskeySupported,
  requestEmailOtp,
  signInWithPasskey,
  signOut as performSignOut,
  toUserFacingError,
  verifyEmailOtp,
} from './session-client';

interface DesktopAuthContextValue {
  apiBaseUrl: string;
  clearError: () => void;
  email: string;
  isPasskeyAvailable: boolean;
  restartAuth: () => void;
  requestOtp: (email: string) => Promise<void>;
  session: HominemSession | null;
  signInWithPasskey: () => Promise<void>;
  signOut: () => Promise<void>;
  state: AppAuthState;
  updateEmail: (email: string) => void;
  verifyOtp: (otp: string) => Promise<void>;
}

const DesktopAuthContext = createContext<DesktopAuthContextValue | null>(null);

export function DesktopAuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appAuthStateMachine, initialAppAuthState);
  const [session, setSession] = useState<HominemSession | null>(null);
  const [email, setEmail] = useState('');

  const apiBaseUrl = desktopEnv.VITE_PUBLIC_API_URL;

  const loadSession = useCallback(async () => {
    dispatch({ type: 'REFRESH_STARTED' });
    try {
      const result = await bootstrapSession(apiBaseUrl);
      setSession(result.session);

      if (result.user) {
        dispatch({ type: 'SESSION_LOADED', user: result.user });
        if (result.user.email) {
          setEmail(result.user.email);
        }
        return;
      }

      dispatch({ type: 'SESSION_EXPIRED' });
    } catch (error) {
      setSession(null);
      dispatch({
        type: 'REFRESH_FAILED',
        error: toUserFacingError(error, 'Failed to load desktop auth session.'),
      });
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleRequestOtp = useCallback(
    async (nextEmail: string) => {
      dispatch({ type: 'OTP_REQUEST_STARTED' });
      try {
        await requestEmailOtp(apiBaseUrl, nextEmail);
        setEmail(nextEmail);
        dispatch({ type: 'OTP_REQUESTED' });
      } catch (error) {
        dispatch({
          type: 'OTP_REQUEST_FAILED',
          error: toUserFacingError(error, 'Failed to send verification code.'),
        });
      }
    },
    [apiBaseUrl],
  );

  const handleVerifyOtp = useCallback(
    async (otp: string) => {
      dispatch({ type: 'OTP_VERIFICATION_STARTED' });
      try {
        const result = await verifyEmailOtp(apiBaseUrl, email, otp);
        setSession(result.session);

        if (!result.user) {
          throw new Error('Missing authenticated user after verification.');
        }

        dispatch({ type: 'SESSION_LOADED', user: result.user });
      } catch (error) {
        dispatch({
          type: 'OTP_VERIFICATION_FAILED',
          error: toUserFacingError(error, 'Verification failed. Please try again.'),
        });
      }
    },
    [apiBaseUrl, email],
  );

  const handlePasskeySignIn = useCallback(async () => {
    dispatch({ type: 'PASSKEY_AUTH_STARTED' });
    try {
      const result = await signInWithPasskey(apiBaseUrl);
      setSession(result.session);
      if (!result.user) {
        throw new Error('Passkey sign-in completed without a user.');
      }
      dispatch({ type: 'SESSION_LOADED', user: result.user });
    } catch (error) {
      dispatch({
        type: 'PASSKEY_AUTH_FAILED',
        error: toUserFacingError(error, 'Passkey sign-in failed.'),
      });
    }
  }, [apiBaseUrl]);

  const handleSignOut = useCallback(async () => {
    dispatch({ type: 'SIGN_OUT_REQUESTED' });
    try {
      await performSignOut(apiBaseUrl, session);
      setSession(null);
      dispatch({ type: 'SIGN_OUT_SUCCESS' });
    } catch (error) {
      dispatch({
        type: 'FATAL_ERROR',
        error: toUserFacingError(error, 'Failed to sign out cleanly.'),
      });
    }
  }, [apiBaseUrl, session]);

  const value = useMemo<DesktopAuthContextValue>(
    () => ({
      apiBaseUrl,
      clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
      email,
      isPasskeyAvailable: isPasskeySupported(),
      restartAuth: () => {
        setEmail('');
        setSession(null);
        dispatch({ type: 'RESET_TO_SIGNED_OUT' });
      },
      requestOtp: handleRequestOtp,
      session,
      signInWithPasskey: handlePasskeySignIn,
      signOut: handleSignOut,
      state,
      updateEmail: setEmail,
      verifyOtp: handleVerifyOtp,
    }),
    [
      apiBaseUrl,
      email,
      handlePasskeySignIn,
      handleRequestOtp,
      handleSignOut,
      handleVerifyOtp,
      session,
      state,
    ],
  );

  return <DesktopAuthContext.Provider value={value}>{children}</DesktopAuthContext.Provider>;
}

export function useDesktopAuth() {
  const context = useContext(DesktopAuthContext);
  if (!context) {
    throw new Error('useDesktopAuth must be used within a DesktopAuthProvider');
  }
  return context;
}
