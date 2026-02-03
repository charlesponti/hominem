# Auth Email Guard Plan

## Goal
Add an explicit email-required guard for Google-only auth flows and ensure consistent handling across auth logic.

## Plan
1. Add explicit email-required guard in auth user creation to prevent empty-email inserts.
2. Review any other auth flows that assume email to ensure consistent handling.
3. Summarize changes and rationale for Google-only auth assumptions.

Thanks for asking — this is a solid, nuanced area, and I’m happy to go deep with you. I reviewed the full `packages/auth` surface (server/client, user mapping, DB services, and tools). Below are the findings ordered by severity with concrete, actionable recommendations.

**Findings (ordered by severity)**

1. **[High] Possible login failure for accounts without email**
   - **Where:** `packages/auth/src/user-auth.service.ts`
   - **Why:** `findOrCreateUser` sets `email` to `''` when missing. The `users.email` column is `notNull` and has a **unique constraint**. If any user logs in with no email (phone-based Supabase auth or providers without email), they will collide on `email = ''` and throw a unique violation.
   - **Impact:** Login failures for any non-email auth scenario; also data integrity issues for future providers.
   - **Recommendation:** Decide on a proper policy:
     - Option A: allow `email` to be nullable (best for Supabase phone).
     - Option B: store a synthetic unique email like `user_{supabaseId}@local` and mark as unverified.
     - Option C: enforce email-only auth and fail early with a clear error before DB insert.
   - **Notes:** If you never allow non-email auth, add a guard clause and log a clear error.

2. **[High] Profile data not synced for existing users**
   - **Where:** `packages/auth/src/user-auth.service.ts` and `packages/auth/src/server.ts`
   - **Why:** If user is found by `supabaseId` or `email`, the function returns without updating `name`, `image`, or **email**. Supabase user data often changes (name, avatar, email updates, OAuth provider changes).
   - **Impact:** Stale user profiles in the DB; inconsistent UI; potential email mismatch if user changes email in Supabase.
   - **Recommendation:** On login, when an existing user is found, update profile fields (at least `email`, `name`, `image`, `updatedAt`). This should be safe and idempotent.

3. **[Medium] `updateProfileBySupabaseId` accepts arbitrary keys**
   - **Where:** `packages/auth/src/user-auth.service.ts`
   - **Why:** `updates: Partial<Record<string, unknown>>` is applied directly to `.set({ ...updates })`.
   - **Impact:** If exposed via an API route, this allows changing **any column**, including `isAdmin`, `supabaseId`, etc.
   - **Recommendation:** Whitelist fields (e.g., `name`, `image`, `photoUrl`, `birthday`) and validate via Zod.

4. **[Medium] Auth client types don’t match implementation**
   - **Where:** `packages/auth/src/types.ts` vs `packages/auth/src/client.tsx`
   - **Why:** `AuthContextType` describes `signIn(email, password)`, `signUp`, `signInWithOAuth`, `resetPassword`, etc., but `useSupabaseAuth` only exposes `signIn()` (Google-only) and `logout()`.
   - **Impact:** Consumers could incorrectly rely on missing methods; potential runtime errors or inconsistency across apps.
   - **Recommendation:** Either align the types to the actual implementation or expand `client.tsx` to implement the full interface.

5. **[Medium] Supabase client singleton ignores config mismatches**
   - **Where:** `packages/auth/src/client.tsx`
   - **Why:** `getSupabase` caches a singleton without verifying `config` consistency.
   - **Impact:** Potential bugs in test environments or multi-tenant setups if different config is passed.
   - **Recommendation:** Guard on `config` or avoid the singleton.

6. **[Low] Supabase-to-Hominem user conversion on client can “invent” timestamps**
   - **Where:** `packages/auth/src/user.ts`
   - **Why:** For `SupabaseAuthUser`, if timestamps are missing, it uses `new Date().toISOString()`; this changes on every call.
   - **Impact:** Cache churn, UI flicker, or unexpected diffs in state comparisons.
   - **Recommendation:** Prefer `undefined` or a stable value when source timestamps are missing.

7. **[Low] Tools are placeholders with no auth checks**
   - **Where:** `packages/auth/src/tools.ts`
   - **Why:** The tools return “Updated profile” messages with no validation or authorization.
   - **Impact:** If these tools are surfaced in a runtime with tool execution, they are insecure.
   - **Recommendation:** Either stub behind an explicit dev-only flag or implement real auth + DB calls.

**Additional notes**
- `getServerAuth` correctly calls `supabase.auth.getUser()` and uses your server-side DB for canonical user data. That’s good. It returns headers for cookie setting; just ensure consumers merge/forward those headers on response.
- The user schema uses a **unique index on email** which is good for data integrity, but requires the “email policy” decision described above.
- `toHominemUser` uses `source.photoUrl` as fallback — good for legacy data.

**Recommended next steps (pick one)**
1. I can implement a safe, explicit “sync on login” update and a proper email policy guard in `findOrCreateUser`.
2. I can align `client.tsx` with `AuthContextType` or simplify the type to match reality.
3. I can add Zod-validated profile update helpers and lock down `updateProfileBySupabaseId`.

If you want me to proceed, tell me which option you want first (1, 2, or 3).