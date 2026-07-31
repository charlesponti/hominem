import type { AuthUser as User } from '@ponti-studios/auth/types';
import { useCallback } from 'react';

import { authClient } from '~/services/auth/auth-client';

/**
 * Better Auth's /update-user endpoint notifies the client's session atom on
 * success, so authClient.useSession() picks up the change automatically —
 * no manual refetch or local cache write needed here.
 */
export async function updateProfile(updates: Partial<User>): Promise<void> {
  const result = await authClient.updateUser({
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.image !== undefined ? { image: updates.image } : {}),
  });

  if (result.error) {
    throw new Error(result.error.message ?? 'Failed to update profile');
  }
}

export function useUpdateProfile() {
  return useCallback(updateProfile, []);
}
