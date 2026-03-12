import type { AuthState } from './types';

export interface AuthBootStoredTokens {
  sessionCookieHeader: string | null;
}

export interface AuthBootUser {
  id: string;
  email: string;
  name?: string | null;
}

export type AuthBootResult =
  | {
      type: 'SESSION_LOADED';
      user: NonNullable<AuthState['user']>;
      tokens: { sessionCookieHeader: string };
    }
  | { type: 'SESSION_EXPIRED' };

export interface AuthBootDeps {
  /** Read all stored token values — implementations should parallelize. */
  getStoredTokens: () => Promise<AuthBootStoredTokens>;
  /**
   * Probe the session endpoint with the stored token.
   * - Returns the authenticated user on success (2xx + isAuthenticated).
   * - Returns null when the token is invalid (401) — caller will clear tokens.
   * - Throws on network errors or AbortError — caller handles without clearing tokens.
   */
  probeSession: (input: {
    sessionCookieHeader: string | null;
    signal: AbortSignal;
  }) => Promise<{ user: AuthBootUser } | null>;
  /** Clear all stored tokens. Called only when probeSession returns null (invalid token). */
  clearTokens: () => Promise<void>;
  /** Upsert the user profile in local store and return the normalized profile. */
  upsertProfile: (user: AuthBootUser) => Promise<NonNullable<AuthState['user']> | null>;
  /** One-time legacy data migration — must be idempotent. */
  clearLegacyData: () => Promise<void>;
  /** AbortSignal tied to the boot lifecycle. Throws AbortError on timeout or unmount. */
  signal: AbortSignal;
}

/**
 * Core auth boot logic, extracted for testability.
 *
 * Flow:
 *   1. Run one-time legacy data migration.
 *   2. Read stored tokens.
 *   3. If a token exists, probe the session endpoint.
 *      - Valid → upsert profile → SESSION_LOADED
 *      - Invalid (null) → clear tokens → SESSION_EXPIRED
 *   4. No stored token → SESSION_EXPIRED
 *
 * Network errors and AbortError propagate to the caller, which always resolves
 * boot to SESSION_EXPIRED so the app never hangs in `booting`.
 */
export async function runAuthBoot(deps: AuthBootDeps): Promise<AuthBootResult> {
  const { getStoredTokens, probeSession, clearTokens, upsertProfile, clearLegacyData, signal } =
    deps;

  await clearLegacyData();

  const { sessionCookieHeader } = await getStoredTokens();

  if (sessionCookieHeader) {
    const probeResult = await probeSession({
      sessionCookieHeader,
      signal,
    });

    if (probeResult) {
      const userProfile = await upsertProfile(probeResult.user);
      if (userProfile) {
        return {
          type: 'SESSION_LOADED',
          user: userProfile,
          tokens: { sessionCookieHeader },
        };
      }
    } else {
      // probeSession returned null → 401, token is invalid
      await clearTokens();
    }
  }

  return { type: 'SESSION_EXPIRED' };
}
