# WORK PLAN: Switch Mobile App to Apple Sign-In Only

**Status:** ready  
**Created:** 2026-02-23 14:56  
**Priority:** High  
**Objective:** Remove Google OAuth from mobile app, ensure Apple Sign-In is the sole authentication method, maintain App Store compliance

---

## 📋 EXECUTIVE SUMMARY

This plan removes Google OAuth support from the mobile app (`apps/mobile/`) and establishes Apple Sign-In as the exclusive authentication method. All changes are **mobile-app-only**. Web apps (finance, rocco, notes) retain Google OAuth and are unaffected.

| Aspect | Current | After |
|--------|---------|-------|
| Mobile Auth Method | Apple + Google | Apple only ✅ |
| iOS Entitlements | `usesAppleSignIn: true` | No change (already correct) |
| Login UI | Both options | Apple only |
| Test Flow | E2E tests with Apple | Maintained |
| Web Apps | Google OAuth | No change |

---

## 🎯 OBJECTIVES

1. **Remove Google OAuth** from mobile auth provider entirely
2. **Simplify login UI** to show Apple Sign-In only
3. **Maintain test infrastructure** (E2E tests continue working)
4. **Document changes** in mobile README
5. **Ensure App Store compliance** - no rejection risk
6. **Zero breaking changes** to web apps or other packages

---

## 📁 FILES TO MODIFY

### TIER 1: Critical Auth Changes (Must Do)

#### 1. `apps/mobile/utils/auth-provider.tsx`
**Purpose:** Core auth provider with OAuth methods  
**Current State:** Contains both `signInWithGoogle()` and Apple auth methods  
**Changes:**
- ❌ Remove `signInWithGoogle` callback function (lines 138-170)
- ❌ Remove `signInWithGoogle` from context interface/return
- ✅ Keep `signInWithApple` method (if exists)
- ✅ Keep test credentials flow
- ⚠️ Search for any Google-related error handling that can be removed
- **Deliverable:** File with Apple-only auth, no Google references

**Estimated Changes:** ~40 lines removed

---

### TIER 2: UI Changes (High Priority)

#### 2. `apps/mobile/app/routes/signin.tsx` (or login screen location)
**Purpose:** User-facing login screen  
**Current State:** Likely shows "Sign In with Google" + "Sign In with Apple" buttons  
**Changes:**
- ❌ Remove Google sign-in button/component
- ❌ Remove any Google OAuth UI text/labels
- ✅ Keep Apple sign-in button as primary/only option
- ✅ Update button styling if needed (no longer needs to share space)
- **Deliverable:** Clean login UI with Apple-only option

**Note:** Exact file location needs verification (may be different route name)

---

#### 3. `apps/mobile/app/` - Other screens with auth options
**Purpose:** Any other screens that offer sign-in options  
**Changes:**
- Search for: "Google", "google", "signInWithGoogle" in all `.tsx` files
- Remove any "Connect Google" or "Google Sign-In" buttons
- Update any conditional logic that checks for Google provider
- **Deliverable:** All auth UI surfaces show Apple-only option

---

### TIER 3: Configuration & Documentation

#### 4. `apps/mobile/app.config.ts`
**Purpose:** Expo configuration  
**Current State:** Already has `usesAppleSignIn: true` (line 115) ✅  
**Changes:**
- ✅ No changes needed - already configured correctly
- Review entitlements (lines 70-74) - already set up for Apple Sign-In
- **Verification:** Confirm `expo-apple-authentication` plugin is present if needed

**Note:** This file appears correct; verify no Google OAuth config exists

---

#### 5. `apps/mobile/README.md`
**Purpose:** Developer and user documentation  
**Current State:** Mentions both Apple and Google auth  
**Changes:**
- Update **Line 8**: Change "iOS only" context to explicitly state "Apple Sign-In only"
- Update **Line 138**: Change "Supabase OAuth (Apple Sign-In) with" to highlight Apple as sole provider
- ❌ Remove any references to Google OAuth support
- ✅ Keep PKCE flow, Secure Storage, test credentials documentation
- Update environment variables section if it mentions Google OAuth
- **Deliverable:** Clear documentation that mobile app uses Apple Sign-In exclusively

---

### TIER 4: Testing & E2E

#### 6. `apps/mobile/tests/` - Test files
**Purpose:** E2E tests and unit tests  
**Changes:**
- Search for: "google", "signInWithGoogle" in all test files
- ❌ Remove any tests that mock Google OAuth
- ✅ Keep Apple Sign-In tests (verify they still work)
- ✅ Keep test credentials flow for E2E (if it uses Apple)
- **Deliverable:** All tests pass with Apple-only auth

**Location to check:** 
- `.maestro/` directory (Maestro E2E flows)
- `tests/` directory (unit/integration tests)
- Any mock auth fixtures

---

#### 7. `apps/mobile/package.json`
**Purpose:** Dependencies  
**Changes:**
- ✅ Check if any Google-specific OAuth packages exist (e.g., `@react-oauth/google`)
- ❌ If present, remove unused packages
- ✅ Verify `expo-apple-authentication` is listed (if needed by Supabase)
- ✅ Keep `expo-secure-store` for token storage
- **Deliverable:** Clean dependencies, no unused Google packages

**Note:** May need verification - Supabase might handle Apple auth without additional packages

---

### TIER 5: Search & Verify (Cleanup)

#### 8. Grep search for remaining references
**Commands to run:**
```bash
# Search entire mobile app for Google OAuth references
grep -r "google" apps/mobile/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"
grep -r "signInWithGoogle" apps/mobile/ --include="*.ts" --include="*.tsx"
grep -r "OAuth.*google\|google.*OAuth" apps/mobile/ --include="*.ts" --include="*.tsx"
```

**Action:** For any remaining matches:
- ❌ Remove Google OAuth code
- ✅ Keep Google APIs not related to auth (e.g., if any)
- Document removal reason in commit

---

## 🔄 IMPLEMENTATION WORKFLOW

### Phase 1: Core Auth Changes (Parallel)
**Duration:** ~30 minutes  
**Skills:** TypeScript, React, Supabase Auth

| Task | File | Type | Priority |
|------|------|------|----------|
| Remove Google OAuth method | `auth-provider.tsx` | Code | Critical |
| Verify Apple auth is complete | `auth-provider.tsx` | Code | Critical |
| Remove Google button/option | `signin.tsx` | UI | High |
| Search other screens | `app/` | Code | High |

**Entry Point:** Start with `auth-provider.tsx` removal, verify Apple auth still works

---

### Phase 2: Documentation & Config (Parallel)
**Duration:** ~20 minutes  
**Skills:** Documentation, Expo config

| Task | File | Type | Priority |
|------|------|------|----------|
| Update README | `README.md` | Docs | High |
| Verify app.config.ts | `app.config.ts` | Config | Medium |
| Update package.json | `package.json` | Deps | Medium |

**Entry Point:** Update README as docs-first, verify config is correct

---

### Phase 3: Testing & Verification (Sequential)
**Duration:** ~20 minutes  
**Skills:** Testing, Expo build

| Task | File/Cmd | Type | Priority |
|------|----------|------|----------|
| Search remaining refs | grep searches | Verify | High |
| Update E2E tests | `.maestro/`, `tests/` | Testing | Medium |
| Run test build | `bun run test` | Verify | High |
| Rebuild iOS app | `bun run ios` | Integration | Critical |

**Entry Point:** Run grep searches to identify remaining work

---

### Phase 4: Final Verification (Sequential)
**Duration:** ~15 minutes  
**Skills:** Expo, iOS simulator

| Task | Method | Type | Priority |
|------|--------|------|----------|
| Launch app in simulator | `bun run ios` | Integration | Critical |
| Verify login screen | Manual test | QA | Critical |
| Verify Apple Sign-In works | iOS button tap | Functional | Critical |
| Verify no Google references | App runtime | Validation | High |
| Create atomic commit | git commit | VCS | High |

**Entry Point:** After all code changes, rebuild and test

---

## 📊 DETAILED TASK BREAKDOWN

### Task 1: Remove Google OAuth from auth-provider.tsx
**File:** `apps/mobile/utils/auth-provider.tsx`  
**Type:** Code Removal  
**Complexity:** Low  
**Time:** 5-10 min

**Steps:**
1. Open file
2. Find `signInWithGoogle` function definition (approximately lines 138-170)
3. Remove entire function:
   ```typescript
   // DELETE THIS ENTIRE BLOCK:
   const signInWithGoogle = useCallback(async () => {
     const redirectTo = getMobileRedirectUri()
     const { data, error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: {
         redirectTo,
         skipBrowserRedirect: true,
       },
     })
     // ... rest of function
   }, [router, supabase])
   ```
4. Remove `signInWithGoogle` from context return/interface if present
5. Search file for any other "google" references and remove
6. Verify Apple auth methods remain intact
7. Check imports - remove any Google-related imports if present

**Acceptance Criteria:**
- ✅ No `signInWithGoogle` method exists
- ✅ No "google" string references remain (except in comments about removal)
- ✅ Apple auth methods are untouched
- ✅ File compiles without errors

---

### Task 2: Update login UI to Apple-only
**File:** `apps/mobile/app/` (location TBD - find signin/login screen)  
**Type:** UI/Component  
**Complexity:** Low-Medium  
**Time:** 10-15 min

**Steps:**
1. Find the main login/signin screen component
2. Locate Google sign-in button code
3. Remove Google button component:
   ```typescript
   // DELETE THIS:
   <Button onPress={() => signInWithGoogle()}>
     Sign In with Google
   </Button>
   ```
4. Remove any conditional rendering for Google option
5. Remove imports for Google icon/assets if used
6. Update Apple button to be prominent/primary (now only option)
7. Optional: Simplify button styling since it's no longer crowded
8. Remove any text mentioning "Google" or "other sign-in options"

**Acceptance Criteria:**
- ✅ Only Apple Sign-In button visible on login screen
- ✅ No Google button/text remains
- ✅ Apple button is accessible and functional
- ✅ Screen renders without errors

---

### Task 3: Search and remove Google refs from all other screens
**Files:** `apps/mobile/app/**/*.tsx`  
**Type:** Code Search  
**Complexity:** Low  
**Time:** 10 min

**Steps:**
1. Run grep search:
   ```bash
   grep -r "signInWithGoogle\|Sign.*Google\|google.*Sign" apps/mobile/app/ --include="*.tsx"
   ```
2. For each match found:
   - Open file
   - Remove the line/button/reference
   - Verify context makes sense without it
3. Look for any conditional logic based on provider type
4. Remove Google-specific error messages if present

**Acceptance Criteria:**
- ✅ Grep finds no Google OAuth references
- ✅ All files compile without errors
- ✅ No broken conditional logic

---

### Task 4: Update README.md
**File:** `apps/mobile/README.md`  
**Type:** Documentation  
**Complexity:** Low  
**Time:** 5-10 min

**Current Sections to Update:**
1. **Line 8 - Runtime Scope section:**
   - Change: `"Authentication: Supabase OAuth (Apple provider) with PKCE"`
   - To: `"Authentication: Supabase OAuth (Apple Sign-In only) with PKCE"`
   - Rationale: Make it clear there's only one provider

2. **Line 138 - Architecture section:**
   - Find and update auth description
   - Emphasize: "Mobile app uses Supabase OAuth (Apple Sign-In) - exclusive provider"
   - Remove any mention of Google OAuth availability

3. **Search for "Google" in file:**
   - Remove any references to Google OAuth setup
   - Keep Google Calendar references if present (separate from auth)

4. **Update E2E Testing section if present:**
   - If it mentions Google credentials, remove
   - Clarify test flow uses Apple Sign-In

**Acceptance Criteria:**
- ✅ No "Google OAuth" mentioned in mobile auth context
- ✅ Apple Sign-In clearly stated as exclusive method
- ✅ All code examples show Apple-only flow
- ✅ Documentation is grammatically correct

---

### Task 5: Verify app.config.ts (No changes expected)
**File:** `apps/mobile/app.config.ts`  
**Type:** Verification  
**Complexity:** Low  
**Time:** 3-5 min

**Steps:**
1. Verify line 115: `usesAppleSignIn: true` ✅ (should be present)
2. Check iOS entitlements (lines 70-74):
   - Verify Keychain access group is set
   - Verify no Google OAuth config exists
3. Check plugins array - verify:
   - `expo-secure-store` is present (token storage)
   - `expo-web-browser` is present (OAuth session handling)
   - No Google-specific plugins
4. Verify environment variables don't include Google OAuth secrets

**Acceptance Criteria:**
- ✅ `usesAppleSignIn: true` is present
- ✅ No Google OAuth configuration present
- ✅ Correct plugins listed
- ✅ File syntax is valid

---

### Task 6: Check package.json for unused packages
**File:** `apps/mobile/package.json`  
**Type:** Dependency Cleanup  
**Complexity:** Low  
**Time:** 5 min

**Steps:**
1. Open `package.json`
2. Search for any Google-related OAuth packages:
   - `@react-oauth/google`
   - `google-auth-library`
   - Any other Google auth packages
3. If found:
   - Remove from `dependencies` or `devDependencies`
   - Note: Likely NOT present since Supabase handles OAuth
4. Verify required packages exist:
   - `supabase` (auth client)
   - `expo-secure-store` (token storage)
   - `expo-web-browser` (OAuth flow)
   - `@react-navigation/*` (routing)

**Acceptance Criteria:**
- ✅ No Google OAuth packages present
- ✅ All required packages are listed
- ✅ File is valid JSON

---

### Task 7: Update/verify E2E tests
**Files:** `.maestro/*.yaml`, `tests/**/*`  
**Type:** Testing  
**Complexity:** Medium  
**Time:** 10 min

**Steps:**
1. Check Maestro flows:
   - Look for Google button tap commands
   - Remove Google-related flow steps
   - Verify Apple Sign-In flow remains
2. Check unit/integration tests:
   - Search for `signInWithGoogle` mocks
   - Remove Google OAuth test cases
   - Keep/update Apple Sign-In tests
3. If E2E uses test credentials:
   - Verify test flow works with Apple Sign-In
   - Update README if credentials changed

**Acceptance Criteria:**
- ✅ No Google OAuth test steps present
- ✅ Apple Sign-In tests are updated
- ✅ Test files compile/validate

---

### Task 8: Grep verification - comprehensive search
**Command:** Run from monorepo root  
**Complexity:** Low  
**Time:** 5 min

**Execute searches:**
```bash
# Search mobile app for any remaining Google OAuth references
grep -r "google" apps/mobile/ \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=dist

grep -r "signInWithGoogle\|signInWithGoogleOAuth" apps/mobile/

grep -r "provider.*google\|google.*provider" apps/mobile/ \
  --include="*.ts" --include="*.tsx"
```

**Action for each match:**
- If auth-related → remove
- If unrelated (e.g., Google Maps API) → leave alone
- Document removal reason

**Acceptance Criteria:**
- ✅ No Google OAuth auth references
- ✅ Non-auth Google APIs preserved (if any)
- ✅ All removals documented

---

### Task 9: Integration test - rebuild and run
**Command:** `bun run build` + `bun run ios`  
**Complexity:** Medium  
**Time:** 15-20 min

**Steps:**
1. From monorepo root, install if needed:
   ```bash
   bun install
   ```
2. Build the mobile app:
   ```bash
   bun run build --filter @hominem/mobile
   ```
3. Start dev server:
   ```bash
   bun run dev --filter @hominem/mobile
   ```
4. Launch iOS simulator:
   ```bash
   bun run ios
   ```
5. Verify:
   - App launches without errors
   - Login screen shows only Apple Sign-In option
   - No Google button visible
   - No console errors about missing methods

**Acceptance Criteria:**
- ✅ App builds successfully
- ✅ App runs in simulator
- ✅ Login screen shows Apple-only
- ✅ No runtime errors in console

---

### Task 10: Final verification - manual testing
**Type:** QA Testing  
**Complexity:** Low-Medium  
**Time:** 10 min

**Steps:**
1. In iOS simulator:
   - Tap Apple Sign-In button
   - Verify iOS dialog appears
   - (Don't need to complete auth, just verify flow starts)
2. Inspect UI:
   - Confirm no Google text/buttons anywhere
   - Check button labels and styling
   - Verify dark mode looks correct (app uses dark theme)
3. Check logs/Sentry:
   - No references to Google OAuth in error logs
   - No warnings about missing methods

**Acceptance Criteria:**
- ✅ Apple Sign-In button responds
- ✅ No Google references visible in UI
- ✅ No errors in Sentry/logs
- ✅ App appears production-ready

---

## 🔧 SKILLS & TOOLS REQUIRED

| Skill | Usage | Expertise Level |
|-------|-------|-----------------|
| TypeScript/React | Remove Google OAuth code | Intermediate |
| Expo Configuration | Verify app.config.ts | Beginner |
| Git | Commit changes | Intermediate |
| Bash/Grep | Search for remaining refs | Beginner |
| iOS Simulator | Manual testing | Beginner |

**Recommended Agent Category:** `quick` (focused task execution)  
**Recommended Skills:** `git-master` (for atomic commits)

---

## ✅ VERIFICATION CHECKLIST

Before declaring complete:

- [ ] `auth-provider.tsx` has no `signInWithGoogle` method
- [ ] Login screen shows Apple Sign-In button only
- [ ] No "Google" text appears in any auth-related screens
- [ ] `app.config.ts` has `usesAppleSignIn: true`
- [ ] `package.json` has no Google OAuth packages
- [ ] `README.md` updated to reflect Apple-only auth
- [ ] E2E tests updated or removed for Google
- [ ] Grep search returns zero Google OAuth references
- [ ] App builds successfully with no errors
- [ ] App launches in iOS simulator
- [ ] Login flow works without errors
- [ ] Sentry/logs show no Google OAuth errors
- [ ] Changes committed atomically with clear message
- [ ] Web apps (finance, rocco, notes) are untouched and still work

---

## 🚀 EXECUTION COMMAND

Once approved, run:

```bash
/ghostwire:jack-in-work
```

This starts the operator work session to execute all tasks in dependency order.

---

## 📝 NOTES & DEPENDENCIES

### No Blocking Dependencies
- This is a pure mobile app change
- No API changes required (Supabase handles everything)
- No database changes needed
- No changes to web apps required
- Can be executed independently

### Risk Assessment
- **Risk Level:** Low
- **Breaking Changes:** None (Apple auth is already working)
- **Rollback Plan:** Git reset to previous commit
- **Testing Impact:** E2E tests may need updates, but no production risk

### Parallel Execution Possible
- Phase 1 and Phase 2 can run in parallel
- No conflicts between file edits
- Recommend sequential approach for clarity

---

## 📞 APPROVALS & SIGN-OFF

**Plan Created:** 2026-02-23 14:56  
**Plan Status:** `ready`  
**Ready for Execution:** Yes  

Awaiting operator execution via `/ghostwire:jack-in-work` or manual implementation.
