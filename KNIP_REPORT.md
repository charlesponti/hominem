# Knip Analysis Report

## Summary
- **129 unused files** - Components, utilities, and modules not imported anywhere
- **80 unused dependencies** - Packages declared but not used
- **109 unused exports** - Exported code not imported by other modules
- **45 configuration hints** - Recommendations for improving setup

## Important Constraint
🚨 **DO NOT REMOVE DATABASE SCHEMAS** - All Drizzle schema files must be preserved

---

## High-Impact Safe Removals

### 1. Root Package.json Dependencies
These are likely duplicates in workspaces:
- `react`, `react-dom`, `react-router` - Should be in apps, not root
- `zod-openapi` - Already added to services/api
- `drizzle-orm` - Should be in packages/db only

### 2. Unused UI Dependencies (@hominem/ui)
Many Radix UI components not being used:
- `@radix-ui/react-accordion`
- `@radix-ui/react-collapsible` 
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-progress`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-separator`
- `@radix-ui/react-switch`
- `@radix-ui/react-tooltip`

Plus other heavy UI deps:
- `@rive-app/react-webgl2` - Animation library (3MB+)
- `@streamdown/*` - Markdown processing (multiple packages)
- `ai` - AI SDK in UI package (unused)
- `shiki` - Syntax highlighting (heavy)

### 3. Mobile App Dependencies
Likely unused:
- `expo-blur`
- `expo-device`
- `expo-keep-awake`
- `expo-linear-gradient`
- `expo-speech`
- `expo-status-bar`
- `react-native-redash`

### 4. Notes App Dependencies
- `ai-elements` - Internal package, check usage
- `react-hook-form` - If not using forms

### 5. Services/Workers
- `services/api/src/lib/analytics.ts` - Empty or unused
- `services/api/src/lib/email.ts` - Unused
- `services/api/src/lib/errors.ts` - Check if needed
- `services/api/src/websocket/handlers.ts` - Unused WebSocket handlers

---

## Database-Safe Unused Files

These are safe to review (NOT schema files):

### Apps
- `apps/finance/app/components/accounts/account-connection-status.tsx`
- `apps/finance/app/lib/files.utils.ts`
- `apps/finance/app/lib/get-query-client.ts`
- `apps/mobile/components/animated/fade-in.tsx`
- `apps/mobile/components/avatar.tsx`
- `apps/notes/app/components/chat/*` (many unused chat components)
- `apps/rocco/app/components/footer.tsx`

### Packages (Non-DB)
- `packages/services/src/api-result.ts`
- `packages/services/src/readcv.schema.ts`
- `packages/hono-client/src/react/optimistic.ts`
- `packages/hono-client/src/ssr/server.ts`

---

## Unused Exports (Safe to Remove)

From services/api:
- `ensureAuthSession` from session-store.ts
- `issueRefreshToken` from session-store.ts  
- `revokeRefreshFamily` from session-store.ts
- `sentryErrorHandler` from sentry.ts
- `startServer` from server.ts (if only used internally)

From packages/hono-rpc:
- `verifyPlaidWebhookSignature` from lib/plaid.ts
- `PLAID_REDIRECT_URI` from lib/plaid.ts
- `getOpenAIAdapter` from utils/llm.ts

From packages/health:
- `MentalHealthService` class
- `ExerciseSchema`
- `WorkoutService` class

From packages/hono-rpc components (just added):
- All schema exports (these ARE being exported but may not be used yet)

---

## Recommendations

### Phase 1: Root Dependencies
Remove from root package.json:
```json
"react": "19.1.0",
"react-dom": "19.1.0", 
"react-router": "7.12.0",
"zod-openapi": "4",
"drizzle-orm": "0.45.1"
```

### Phase 2: UI Package
Remove heavy unused dependencies from packages/ui:
- @rive-app/react-webgl2
- @streamdown/* packages
- Unused Radix components

### Phase 3: Mobile App
Remove unused Expo modules after verification

### Phase 4: Clean up obvious unused files
Delete files that are clearly not imported anywhere

---

## Commands to Run

```bash
# Generate detailed report
bun run knip --include files,dependencies,exports > knip-report.txt

# Fix auto-fixable issues
bun run knip --fix

# Check specific package
bun run knip --filter @hominem/ui
```

---

## Next Steps

1. ✅ Knip installed and configured
2. ✅ Initial analysis complete
3. 🔄 Clean up safe items (this report)
4. ⏳ Review each workspace individually
5. ⏳ Add to CI/CD to prevent future bloat
