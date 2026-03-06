## Context

The monorepo currently maintains two separate provider implementations in
`@hominem/auth`: a rich client provider used by apps (`client.tsx`) and a
lighter mock/provider context (`AuthContext.tsx`). Both define their own
`AuthContext` via `createContext`, which has led to runtime errors when a
component imports from one file but the provider is rendered from the other.
Given the scale of the apps and the common need for authenticated API calls, a
single unified API is essential for stability and developer ergonomics.

Existing tests and some utilities rely on the mock provider, while production
code depends on the client provider. During earlier fixes we already exported a
shared `AuthContext` and renamed the simple provider to `LocalMockAuthProvider`.
However, the overall export surface remains confusing and apps still accept
extraneous props like `initialSession` to satisfy mismatched imports.

This design addresses both the immediate bug and cultivates a more sustainable
architecture for authentication across all packages.

## Goals / Non-Goals

**Goals:**

- Offer a *single* `AuthProvider` export that apps use, with strict props
  reflecting real configuration requirements.
- Maintain a mockable authentication facility for tests/development that does
  not accidentally get imported by production code.
- Provide helper hooks: `useAuth` (throws) and `useSafeAuth` (nullable).
- Clean up past workarounds and ensure type safety catches future mismatches.
- Update app code and library utilities to align with the new API.

**Non-Goals:**

- Implement a full server-side or OAuth mechanism (existing logic remains).
- Alter authentication semantics or data models; behavior remains unchanged.
- Introduce a new external dependency.

## Decisions

1. **Single context object**  
   We export `AuthContext` only from `AuthContext.tsx` and the client provider
   and mock provider both import from there.  This prevents identity mismatch.

2. **Provider naming & exports**  
   - `AuthProvider` stays in `client.tsx` and becomes the canonical public
     component.  
   - `LocalMockAuthProvider` (formerly `MockAuthProvider`) remains in
     `AuthContext.tsx` and is *not* re-exported from the package root.  This
     ensures production code cannot accidentally import the mock variant.

3. **Prop tightening**  
   `AuthProviderProps` now mandates `config: AuthConfig` and an optional
   `onAuthEvent`.  We drop `initialSession` from the public type.  Early
   versions of apps that passed `initialSession` will need a migration shim or
   update; tests can use `LocalMockAuthProvider` which ignores extra props.

4. **Hook split**  
   - `useAuth` continues to assert context presence (for protected components).  
   - Add `useSafeAuth` in client.tsx that returns `AuthContextType | null` and
     is safe for layout/SSR code.

5. **HonoProvider refactor**  
   Convert providers to receive a `getAuthToken` callback prop rather than
   calling `useAuthContext` directly. Root layouts will supply the callback
   by reading from `useSafeAuth` or injecting nothing during SSR.

6. **App updates**  
   Modify each app root and header/HonoProvider accordingly. Remove any
   explicit `initialSession` prop usages or adjust to new type.

7. **Type and export cleanup**  
   Adjust `packages/auth/src/index.ts` to only re-export the client provider
   and the context/hooks; remove any re-exports of mock provider or duplicate
   names.

## Risks / Trade-offs

- [Risk] **Migration pain** → Some apps may break due to missing `initialSession` prop; mitigation: provide clear compile-time errors and a short-lived shim
  in each root layout until they are updated.
- [Risk] **Tests failing** due to renamed mock provider → fix by updating
  imports in test utilities or adding migration note.
- [Risk] **Accidental imports** of old context may still exist in miscellaneous
  utilities; mitigation is thorough grep and lint rule enforcing import paths.

## No Migration Plan yet?** (not required)**

We’ll handle migration as part of implementation tasks.

## Open Questions

- Should we keep `useAuthContext` alias for backwards compatibility or remove it
  entirely? (probably remove; it's just confusing)
- Do any CI or build scripts reference the old provider names? Search repo.

