## 1. Package API cleanup

- [x] 1.1 Remove any duplicate exports from `packages/auth/src/index.ts` so
      only the client provider, types, and context/hooks are exposed.
- [x] 1.2 Ensure `LocalMockAuthProvider` is not re-exported at package root.

## 2. Context unification

- [x] 2.1 Move `AuthContext` definition solely into `packages/auth/src/AuthContext.tsx`.
- [x] 2.2 Update `client.tsx` to import the shared `AuthContext` instead of
      recreating it.
- [x] 2.3 Remove any other `createContext` calls in the repo for auth.

## 3. Provider prop tightening

- [x] 3.1 Adjust `AuthProviderProps` in `client.tsx` to drop `initialSession`
      and disallow extra props.
- [x] 3.2 Update all app roots (`notes`, `finance`, `rocco`, `mobile`) to
      remove passed `initialSession` and adjust types.

## 4. Hook helpers

- [x] 4.1 Implement `useSafeAuth` in `client.tsx` returning nullable context.
- [x] 4.2 Deprecate or remove `useAuthContext` alias accordingly.

## 5. Mock provider adjustments

- [x] 5.1 Rename `MockAuthProvider` component to `LocalMockAuthProvider`
      in `AuthContext.tsx` and update tests.
- [x] 5.2 Ensure mock helper exports (createMockAuthProvider, etc.) are only
      available under `/providers/mock` and not at root.

## 6. App code updates

- [x] 6.1 Update headers, Hono providers and any components to use
      `useSafeAuth` or `useAuth` appropriately.
- [x] 6.2 Fix import paths in apps that referenced the old provider/namespace.
- [x] 6.3 Run typecheck and fix errors in each application.

## 7. Documentation & tests

- [x] 7.1 Add README or code comments explaining the proper import patterns.
- [x] 7.2 Add/adjust unit tests to verify context identity and safe hook
      behavior.

## 8. Cleanup and verification

- [x] 8.1 Re-run `bun run check` across workspace and ensure zero auth-related
      errors.
- [x] 8.2 Perform manual smoke run of each application to confirm functionality.
