import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { captureAuthAnalyticsEvent, captureAuthAnalyticsFailure } from '~/services/auth/analytics';
import { authClient } from '~/services/auth/auth-client';
import { clearPersistedQueryCache } from '~/services/query-persistence';
import { LocalStore } from '~/services/storage/local-store';

export function useSignOut(currentEmail: string | null | undefined) {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    const startedAt = Date.now();

    captureAuthAnalyticsEvent('auth_sign_out_started', {
      phase: 'sign_out',
      email: currentEmail ?? undefined,
    });

    let signOutError: Error | null = null;
    try {
      const result = await authClient.signOut();
      if (result.error) {
        signOutError = new Error(result.error.message ?? 'Failed to sign out. Please try again.');
      }
    } catch (error) {
      signOutError =
        error instanceof Error ? error : new Error('Failed to sign out. Please try again.');
    }

    // Always clear local state, even if the server-side sign-out request
    // failed (e.g. API downtime) -- otherwise a stale, possibly
    // wrong-account cache survives and gets shown after the next sign-in.
    queryClient.clear();
    await clearPersistedQueryCache();
    await LocalStore.clearAllData();

    if (signOutError) {
      captureAuthAnalyticsFailure('auth_sign_out_failed', {
        phase: 'sign_out',
        durationMs: Date.now() - startedAt,
        email: currentEmail ?? undefined,
        error: signOutError,
        failureStage: 'network',
      });
      throw signOutError;
    }

    captureAuthAnalyticsEvent('auth_sign_out_succeeded', {
      phase: 'sign_out',
      durationMs: Date.now() - startedAt,
      email: currentEmail ?? undefined,
      statusCode: 200,
    });
  }, [currentEmail, queryClient]);
}
