# Desktop Shell Foundation

## Why

Neko is a standalone Electron desktop app for substance tracking that exists outside the hominem monorepo. We want to integrate it as `apps/desktop` and establish a clean foundation for building a multi-platform product (web, mobile, desktop) that shares business logic across all three.

Currently:

- Neko is isolated in `~/Developer/neko/` with its own git history, bun.lock, and build pipeline
- The notes app (`apps/notes`) is a web-first React Router app with backend integration
- There's no desktop client that can share code with the web app
- Domain logic (tracker functionality) is mixed with UI, IPC, and Electron setup

By building an optimized desktop shell first, we create a foundation to unify logic across platforms.

## What Changes

### Architecture Changes

- **Migrate neko → apps/desktop** in the hominem monorepo
- **Delete all domain-specific code** from the desktop app (tracker components, data fetching, IPC handlers)
- **Create a minimal Electron shell** that loads React and syncs with monorepo design system
- **Establish Phase 2 path**: Share business logic between `apps/notes` (web) and `apps/desktop` (desktop)

### Integration Approach: Two-Phase

**Phase 1 (this change):** Desktop Shell Foundation

1. Copy neko into monorepo as `apps/desktop/`
2. Remove all tracker/substance/possession/container code
3. Remove all custom UI components, dialogs, hooks
4. Keep: Electron main process, preload IPC bridge, build config
5. Create minimal `App.tsx` shell with Tailwind + @hominem/ui integration
6. Ensure it builds, typechecks, and runs within monorepo

**Phase 2 (future):** Shared Logic Layer

1. Create `packages/tracker-logic/` with business logic and components
2. Share React components between `apps/notes` and `apps/desktop`
3. Replace Electron IPC with `@hominem/hono-client` RPC calls
4. Unify auth, styling, and data fetching across both platforms

### Breaking Changes

- **BREAKING**: Neko's current tracker functionality will not be available until Phase 2
- **BREAKING**: IPC API changes during Phase 2 (switching from preload to RPC client)
- The desktop app will exist as an empty shell between this change and Phase 2

### New Capabilities

- `desktop-electron-shell`: Lean, optimized Electron app ready for content
- `desktop-monorepo-integration`: Desktop builds integrated with Turbo, Bun workspaces
- `desktop-design-system`: Electron app using @hominem/ui design tokens, typography, spacing

### Modified Capabilities

- None yet. Phase 2 will add unified multi-platform logic.

## Capabilities

### New Capabilities

- `desktop-electron-shell`: Minimal Electron app shell with modern build tooling
- `desktop-monorepo-integration`: Desktop app integrated into Turbo build system and Bun workspaces
- `desktop-design-system`: Tailwind + @hominem/ui available in desktop context

### Removed Capabilities

- `tracker-desktop`: Substance tracker functionality (temporarily removed, will return in Phase 2 with unified logic)

## Impact

### Affected Code

- **New**: `apps/desktop/` with Electron setup
- **Modified**: `bun.lock` (new workspace dependencies)
- **Modified**: Monorepo root `package.json` (already includes `apps/*` in workspaces)
- **Unaffected**: `apps/notes/`, `services/api/`, `packages/*`

### Dependencies Added (to apps/desktop)

- `@hominem/auth` — Auth utilities
- `@hominem/env` — Environment configuration
- `@hominem/hono-client` — RPC client (available for Phase 2)
- `@hominem/hono-rpc` — RPC types
- `@hominem/ui` — Shared components and styles
- `@hominem/utils` — Shared utilities
- `@electron-toolkit/preload` — Electron preload utilities
- `@electron-toolkit/utils` — Electron utilities
- `electron` — Electron runtime
- `electron-builder` — Desktop installer packaging
- `electron-vite` — Build tool for Electron
- `@vitejs/plugin-react` — React integration
- `@tailwindcss/vite` — Tailwind CSS plugin

### Dependencies Removed

- Various neko-specific packages (base-ui, chart.js, motion, etc.) not needed for shell phase

### Systems Affected

- Monorepo structure (adds new app)
- Build pipeline (Turbo tasks for desktop)
- Development workflow (new dev server for Electron)
- Distribution/packaging (future: electron-builder for installers)

## Timeline & Scope

**Scope (Phase 1):**

- Copy and integrate neko codebase
- Remove domain code
- Establish minimal shell
- Verify builds and runs in monorepo

**Out of scope (Phase 2):**

- Sharing business logic with notes app
- RPC integration
- Functionality restoration
- Platform-specific optimizations

## Risks & Unknowns

1. **IPC Type Safety**: Neko's preload API won't integrate with @hominem types until Phase 2. Temporary mismatch acceptable.

2. **Electron Version Compatibility**: Neko uses Electron 40.x. Need to verify compatibility with monorepo dependencies.

3. **Build Performance**: electron-vite + Tailwind may have slow rebuild times. Will benchmark after implementation.

4. **Turbo Integration**: electron-vite differs from React Router build model. Need careful script configuration to avoid issues.

5. **Bundle Size**: Including @hominem/ui, @hominem/hono-client, etc. will increase desktop bundle. Accept for now, optimize in Phase 3.

6. **Development Server**: electron-vite's dev server works differently than React Router. HMR behavior may differ.

## Success Criteria

- ✓ `apps/desktop/` exists in monorepo and is listed in workspaces
- ✓ All tracker/substance/possession/container code is deleted
- ✓ `App.tsx` is minimal (renders placeholder or layout shell only)
- ✓ `bun install` succeeds without errors
- ✓ `bun run lint` passes
- ✓ `bun run typecheck` passes
- ✓ `bun run --filter @hominem/desktop dev` starts electron-vite dev server
- ✓ Electron window opens and renders React content
- ✓ Tailwind CSS is loaded and functional (verify in DevTools)
- ✓ @hominem/ui design tokens are applied (colors, typography, spacing)
- ✓ Preload IPC bridge is functional (window.electronAPI is available)
- ✓ No console errors or type mismatches
