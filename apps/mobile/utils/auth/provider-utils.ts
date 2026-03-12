import type { AuthState } from './types';

export type AuthStatusCompat = AuthState['status'];

export function resolveIsLoadingAuth(state: AuthState): boolean {
  return state.isLoading || state.status === 'booting';
}
