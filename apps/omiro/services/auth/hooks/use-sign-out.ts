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

    try {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to sign out. Please try again.');
      }

      queryClient.clear();
      await clearPersistedQueryCache();
      await LocalStore.clearAllData();
      captureAuthAnalyticsEvent('auth_sign_out_succeeded', {
        phase: 'sign_out',
        durationMs: Date.now() - startedAt,
        email: currentEmail ?? undefined,
        statusCode: 200,
      });
    } catch (error) {
      const resolvedError =
        error instanceof Error ? error : new Error('Failed to sign out. Please try again.');
      captureAuthAnalyticsFailure('auth_sign_out_failed', {
        phase: 'sign_out',
        durationMs: Date.now() - startedAt,
        email: currentEmail ?? undefined,
        error: resolvedError,
        failureStage: 'network',
      });
      throw resolvedError;
    }
  }, [currentEmail, queryClient]);
}
