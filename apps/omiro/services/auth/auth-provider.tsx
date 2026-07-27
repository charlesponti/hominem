import type { User } from '@hominem/auth/types';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { E2E_TESTING } from '~/constants';
import { authClient } from '~/services/auth/auth-client';
import { clearLegacyDataOnce } from '~/services/auth/boot-legacy-data';
import { useAuthHeaders } from '~/services/auth/hooks/use-auth-headers';
import { useEmailOtp } from '~/services/auth/hooks/use-email-otp';
import { useResetAuthForE2E } from '~/services/auth/hooks/use-reset-auth-for-e2e';
import { useSignOut } from '~/services/auth/hooks/use-sign-out';
import { useUpdateProfile } from '~/services/auth/hooks/use-update-profile';
import queryClient from '~/services/query-client';
import { clearPersistedQueryCache } from '~/services/query-persistence';
import { LocalStore } from '~/services/storage/local-store';

type AuthContextType = {
  isPending: boolean;
  isSignedIn: boolean;
  isSigningOut: boolean;
  currentUser: User | null;
  requestEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (input: { email: string; otp: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  handleUnauthorized: () => Promise<void>;
  resetAuthForE2E: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

function toUser(sessionUser: {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): User {
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    image: sessionUser.image ?? null,
    emailVerified: sessionUser.emailVerified,
    createdAt: new Date(sessionUser.createdAt).toISOString(),
    updatedAt: new Date(sessionUser.updatedAt).toISOString(),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { data, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasRunLegacyMigrationRef = useRef(false);
  const hasRunE2EResetRef = useRef(false);

  const currentUser = useMemo(() => (data?.user ? toUser(data.user) : null), [data?.user]);
  const isSignedIn = Boolean(currentUser) && !isSigningOut;

  const { requestEmailOtp, verifyEmailOtp } = useEmailOtp();
  const updateProfile = useUpdateProfile();
  const getAuthHeaders = useAuthHeaders();
  const resetAuthForE2E = useResetAuthForE2E();
  const runSignOut = useSignOut(currentUser?.email);

  useEffect(() => {
    if (hasRunLegacyMigrationRef.current) return;
    hasRunLegacyMigrationRef.current = true;
    void clearLegacyDataOnce();
  }, []);

  useEffect(() => {
    if (!E2E_TESTING || hasRunE2EResetRef.current) return;
    hasRunE2EResetRef.current = true;
    void resetAuthForE2E();
  }, [resetAuthForE2E]);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await runSignOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [runSignOut]);

  const handleUnauthorized = useCallback(async () => {
    await authClient.signOut().catch(() => undefined);
    queryClient.clear();
    await clearPersistedQueryCache();
    await LocalStore.clearAllData();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      isPending,
      isSignedIn,
      isSigningOut,
      currentUser,
      requestEmailOtp,
      verifyEmailOtp,
      signOut,
      updateProfile,
      getAuthHeaders,
      handleUnauthorized,
      resetAuthForE2E,
    }),
    [
      isPending,
      isSignedIn,
      isSigningOut,
      currentUser,
      requestEmailOtp,
      verifyEmailOtp,
      signOut,
      updateProfile,
      getAuthHeaders,
      handleUnauthorized,
      resetAuthForE2E,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
