# Desktop Shell Foundation - Tasks

## Phase 1 Implementation Tasks

### Task Group 1: Repository Setup

#### 1.1: Copy neko to apps/desktop

- **Objective**: Migrate neko into monorepo as a workspace app
- **Steps**:
  1. Copy `~/Developer/neko/` → `hominem/apps/desktop/`
  2. Preserve: `src/main/`, `src/preload/`, `electron.vite.config.ts`
  3. Delete: `src/renderer/src/` (all domain code)
  4. Delete: `src/shared/` (temporary, will rebuild in Phase 2)
  5. Keep: `public/` (icons, assets)
- **Definition of Done**:
  - ✓ `apps/desktop/` directory exists
  - ✓ All neko files are copied
  - ✓ No merge conflicts in git
  - ✓ `.gitignore` is updated if needed

#### 1.2: Update package.json for monorepo

- **Objective**: Align package.json with hominem workspace standards
- **Changes**:
  - Set `"name": "@hominem/desktop"`
  - Set `"private": true`
  - Update scripts (lint, format, typecheck, test, build, dev)
  - Update dependencies to use `workspace:*` for @hominem packages
  - Remove tracker-specific dependencies (base-ui, chart.js, motion, yaml)
  - Add: `@hominem/auth`, `@hominem/env`, `@hominem/hono-client`, `@hominem/ui`, `@hominem/utils`
  - Ensure Electron and build tool versions match neko's current versions
- **Definition of Done**:
  - ✓ `bun install` succeeds without warnings
  - ✓ All @hominem dependencies resolve to workspace packages
  - ✓ No version conflicts in lockfile

#### 1.3: Update tsconfig.json

- **Objective**: Align TypeScript config with monorepo standards
- **Changes**:
  - Match compiler options with `apps/notes/tsconfig.json`
  - Add path aliases for `@/*` → `./src/renderer/src/*`
  - Add path aliases for `@hominem/*`
  - Set `"noEmit": true` (build tool handles emission)
  - Enable strict mode: `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`
  - Set `"skipLibCheck": true` (speed up type checking)
- **Definition of Done**:
  - ✓ `bun run typecheck` runs without errors
  - ✓ Path aliases work in IDE autocomplete

### Task Group 2: Build Configuration

#### 2.1: Update electron.vite.config.ts

- **Objective**: Configure electron-vite for monorepo + Tailwind
- **Changes**:
  1. Add `vite-tsconfig-paths` plugin to renderer config for @/\* aliases
  2. Ensure `@tailwindcss/vite` is loaded in renderer plugins
  3. Ensure `@vitejs/plugin-react` is loaded before Tailwind
  4. Keep `externalizeDepsPlugin()` for main and preload
  5. Update renderer root to `resolve(__dirname, 'src/renderer')`
  6. Verify build output paths
- **Definition of Done**:
  - ✓ `bun run --filter @hominem/desktop build` completes without errors
  - ✓ Build output exists in `apps/desktop/out/`
  - ✓ Tailwind CSS is included in renderer bundle

#### 2.2: Create vite.config.ts

- **Objective**: Support tsconfig path aliases in Vite
- **Steps**:
  1. Create `apps/desktop/vite.config.ts`
  2. Add `tsconfigPaths` plugin (same pattern as notes app)
  3. Minimal config, just for alias support
- **Example**:

  ```typescript
  import { defineConfig } from 'vite';
  import tsconfigPaths from 'vite-tsconfig-paths';

  export default defineConfig({
    plugins: [tsconfigPaths()],
  });
  ```

- **Definition of Done**:
  - ✓ File exists
  - ✓ No errors in vite resolution

#### 2.3: Configure electron-builder

- **Objective**: Setup packaging for macOS, Windows, Linux
- **Changes** (in `electron.vite.config.ts` or separate `electron-builder.yml`):
  1. Set `appId: com.hominem.desktop` (or similar)
  2. Set `productName: Hominem`
  3. Configure DMG for macOS (arm64 + x64)
  4. Configure NSIS for Windows
  5. Configure AppImage for Linux
  6. Ensure build resources path is correct
- **Definition of Done**:
  - ✓ `bun run --filter @hominem/desktop package` builds DMG
  - ✓ `bun run --filter @hominem/desktop package:all` builds all platforms
  - ✓ Installers are created in `release/` directory

### Task Group 3: React & Styling Setup

#### 3.1: Delete old domain code from renderer

- **Objective**: Remove all tracker/substance/component code
- **Steps**:
  1. Delete `src/renderer/src/components/` (all component files)
  2. Delete `src/renderer/src/App.tsx`
  3. Delete `src/renderer/src/style.css`
  4. Delete `src/renderer/src/main.tsx` (will recreate)
  5. Keep: `src/renderer/index.html`, `public/`
- **Definition of Done**:
  - ✓ No tracker-related code remains
  - ✓ No import errors for deleted files

#### 3.2: Create minimal src/renderer/src/main.tsx

- **Objective**: React entry point
- **Content**:

  ```typescript
  import React from 'react'
  import ReactDOM from 'react-dom/client'
  import { App } from './App'
  import './globals.css'

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  ```

- **Definition of Done**:
  - ✓ File created
  - ✓ No type errors

#### 3.3: Create minimal src/renderer/src/App.tsx

- **Objective**: Placeholder shell that proves design system works
- **Content**:
  - Import from @hominem/ui if components exist
  - Use Tailwind classes from @hominem/ui design tokens
  - Display "Desktop Shell" heading and status message
  - Apply bg-bg-base, text-text-primary, etc. (Tailwind tokens)
- **Example**:
  ```typescript
  export function App() {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-bg-base text-text-primary">
        <h1 className="text-4xl font-bold">Desktop Shell</h1>
        <p className="mt-2 text-text-secondary">Ready for Phase 2</p>
      </div>
    )
  }
  ```
- **Definition of Done**:
  - ✓ Component renders without errors
  - ✓ Tailwind classes apply (verify in DevTools)
  - ✓ Text is readable (not white text on white, etc.)

#### 3.4: Create src/renderer/src/globals.css

- **Objective**: Load monorepo design system into desktop
- **Content**:

  ```css
  @import '@hominem/ui/styles/globals.css';
  @import '@hominem/ui/styles/animations.css';

  /* Desktop-specific overrides (if needed) */
  ```

- **Steps**:
  1. Create the file
  2. Import @hominem/ui styles
  3. Verify Tailwind tokens are available
- **Definition of Done**:
  - ✓ File imports successfully
  - ✓ @hominem/ui fonts load
  - ✓ Tailwind classes like `text-text-primary` work

#### 3.5: Update src/renderer/index.html

- **Objective**: Minimal HTML entry point
- **Changes**:
  1. Set title to "Hominem"
  2. Ensure root div has `id="root"`
  3. Add defer script tag for `/src/main.tsx`
  4. Remove any hardcoded styles (use globals.css)
- **Example**:
  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Hominem</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```
- **Definition of Done**:
  - ✓ HTML is valid
  - ✓ Root div exists

### Task Group 4: IPC & Electron Setup (Minimal)

#### 4.1: Review and keep src/main/index.ts

- **Objective**: Ensure Electron main process is configured correctly
- **Checks**:
  1. Verify BrowserWindow creation
  2. Verify preload script path is correct
  3. Verify contextIsolation and nodeIntegration settings
  4. Keep basic IPC handlers (minimal)
  5. No domain-specific IPC (remove tracker handlers if present)
- **Definition of Done**:
  - ✓ Main process starts without errors
  - ✓ BrowserWindow opens
  - ✓ Dev server URL is correct (http://localhost:5173 in dev)

#### 4.2: Review and keep src/preload/index.ts

- **Objective**: Minimal preload bridge
- **Changes**:
  1. Remove all tracker-specific handlers
  2. Keep only: platform info, basic app lifecycle
  3. Ensure ElectronAPI interface is minimal
  4. Ensure type declarations are included
- **Minimal ElectronAPI**:
  ```typescript
  interface ElectronAPI {
    platform: NodeJS.Platform;
  }
  ```
- **Definition of Done**:
  - ✓ Preload compiles without errors
  - ✓ window.electronAPI is available in DevTools console
  - ✓ window.electronAPI.platform returns process.platform

### Task Group 5: Monorepo Integration

#### 5.1: Verify apps/desktop is in workspace

- **Objective**: Ensure Bun and Turbo recognize the app
- **Checks**:
  1. Verify `package.json` has `"workspaces": ["apps/*", ...]`
  2. Run `bun install` from root
  3. Verify `apps/desktop/node_modules` is linked to root node_modules
- **Definition of Done**:
  - ✓ `bun install` succeeds
  - ✓ `bun run --filter @hominem/desktop --list` shows app
  - ✓ Dependencies resolve correctly

#### 5.2: Add Turbo tasks

- **Objective**: Integrate with monorepo CI/CD
- **Changes** (if needed in monorepo root `turbo.json`):
  1. Ensure `build` task includes `apps/desktop`
  2. Ensure `lint` task includes `apps/desktop`
  3. Ensure `typecheck` task includes `apps/desktop`
  4. Ensure `dev` task can target `@hominem/desktop`
- **Verification**:
  ```bash
  bun run build
  bun run lint
  bun run typecheck
  bun run dev --filter @hominem/desktop
  ```
- **Definition of Done**:
  - ✓ `bun run build` includes desktop build
  - ✓ `bun run lint` includes desktop lint
  - ✓ `bun run typecheck` includes desktop typecheck
  - ✓ `bun run dev --filter @hominem/desktop` works

#### 5.3: Add to .gitignore (if needed)

- **Objective**: Ensure built files aren't committed
- **Additions** (if not already in root .gitignore):
  - `apps/desktop/build/`
  - `apps/desktop/out/`
  - `apps/desktop/release/`
  - `apps/desktop/dist/`
- **Definition of Done**:
  - ✓ Build artifacts are ignored
  - ✓ `git status` doesn't show built files

### Task Group 6: Testing & Verification

#### 6.1: Lint & Format

- **Objective**: Ensure code meets monorepo standards
- **Steps**:
  1. Run `bun run --filter @hominem/desktop lint`
  2. Run `bun run --filter @hominem/desktop format`
  3. Fix any violations
- **Definition of Done**:
  - ✓ `bun run lint` passes
  - ✓ `bun run format` makes no changes

#### 6.2: Type Check

- **Objective**: No TypeScript errors
- **Steps**:
  1. Run `bun run --filter @hominem/desktop typecheck`
  2. Fix any type errors
  3. Verify @hominem/\* imports resolve
- **Definition of Done**:
  - ✓ `bun run typecheck` passes
  - ✓ No "Cannot find module" errors for @hominem packages

#### 6.3: Build

- **Objective**: Verify build succeeds
- **Steps**:
  1. Run `bun run --filter @hominem/desktop build`
  2. Verify `build/` directory is created
  3. Verify main.js, preload.js, renderer files exist
- **Definition of Done**:
  - ✓ Build completes in < 30 seconds
  - ✓ `apps/desktop/out/` contains main/, preload/, renderer/
  - ✓ No build errors

#### 6.4: Dev Server

- **Objective**: Verify electron-vite dev mode works
- **Steps**:
  1. Run `bun run --filter @hominem/desktop dev`
  2. Wait for "http://localhost:5173" message
  3. Electron window should open
  4. Verify React content renders
  5. Open DevTools (Cmd+Option+I on macOS)
  6. Verify window.electronAPI is available
  7. Verify Tailwind classes are applied (inspect element)
  8. Verify no console errors
- **Definition of Done**:
  - ✓ Dev server starts in < 10 seconds
  - ✓ Electron window opens automatically
  - ✓ "Desktop Shell" heading is visible
  - ✓ Text is rendered in correct color (@hominem/ui tokens)
  - ✓ DevTools show no errors
  - ✓ window.electronAPI.platform returns "darwin" (or other platform)
  - ✓ Tailwind purge works (unused classes not in bundle)

#### 6.5: HMR Test

- **Objective**: Verify hot module replacement works
- **Steps**:
  1. With dev server running, edit `src/renderer/src/App.tsx`
  2. Change heading text "Desktop Shell" → "Desktop Shell (Updated)"
  3. Save file
  4. Verify window updates without full reload
  5. Verify no error stack traces in DevTools
- **Definition of Done**:
  - ✓ HMR updates appear in < 1 second
  - ✓ No full-page reload occurs
  - ✓ DevTools state is preserved (not cleared)

#### 6.6: Package Verification

- **Objective**: Verify installer can be created
- **Steps**:
  1. Run `bun run --filter @hominem/desktop build`
  2. Run `bun run --filter @hominem/desktop package`
  3. Verify .dmg (macOS) or installer is created in `release/`
  4. (Optional: Test installer by opening it)
- **Definition of Done**:
  - ✓ `bun run package` completes without errors
  - ✓ `.dmg` file exists in `apps/desktop/release/`
  - ✓ Installer is > 50MB (includes Electron + bundle)

#### 6.7: Full Monorepo Check

- **Objective**: Ensure desktop doesn't break other apps
- **Steps**:
  1. Run `bun run check` from monorepo root
  2. Verify all tasks complete
  3. Verify no new errors in other apps
- **Definition of Done**:
  - ✓ `bun run check` passes
  - ✓ `bun run build` includes desktop and succeeds
  - ✓ `bun run test` includes desktop and passes (vitest --passWithNoTests)

### Task Group 7: Documentation

#### 7.1: Add README

- **Objective**: Document the desktop shell
- **Location**: `apps/desktop/README.md`
- **Content**:
  - Purpose (desktop shell foundation)
  - Quick start (bun install, bun run dev)
  - Build instructions (bun run build, bun run package)
  - Development tips (DevTools, HMR, troubleshooting)
  - Architecture overview (main, preload, renderer)
  - Phase 2 notes (when logic will be added)
- **Definition of Done**:
  - ✓ README exists and is clear
  - ✓ New developer can follow "Quick Start" and run the app

#### 7.2: Update monorepo README (if needed)

- **Objective**: Document that desktop app exists
- **Changes**:
  - Add `apps/desktop/` to apps list
  - Note that it's currently a shell (Phase 1)
  - Link to Phase 2 proposal for context
- **Definition of Done**:
  - ✓ Monorepo README mentions desktop app

### Task Group 8: Cleanup & Final Checks

#### 8.1: Clean up neko repo

- **Objective**: Archive or mark original neko directory
- **Options**:
  1. Keep `~/Developer/neko/` as-is (for reference)
  2. Archive to `~/Developer/neko.archive/`
  3. Delete if confident migration is complete
- **Decision**: Keep for now (can delete after Phase 2 is solid)
- **Definition of Done**:
  - ✓ Intentional decision made about neko directory
  - ✓ No confusion about canonical source (it's `apps/desktop/`)

#### 8.2: Final smoke test

- **Objective**: Verify everything works end-to-end
- **Checklist**:
  - ✓ `bun install` succeeds
  - ✓ `bun run lint` passes
  - ✓ `bun run format` makes no changes
  - ✓ `bun run typecheck` passes
  - ✓ `bun run check` passes
  - ✓ `bun run --filter @hominem/desktop dev` starts and opens window
  - ✓ Window renders "Desktop Shell" with correct styling
  - ✓ `bun run --filter @hominem/desktop build` succeeds
  - ✓ `bun run --filter @hominem/desktop package` creates installer
  - ✓ No console errors or warnings in DevTools
- **Definition of Done**:
  - ✓ All checks pass
  - ✓ Ready to activate next change (Phase 2)

## Task Estimation

| Task Group | Tasks  | Estimated Hours | Notes                                             |
| ---------- | ------ | --------------- | ------------------------------------------------- |
| 1.1-1.3    | 3      | 1-2h            | Straightforward copy + config sync                |
| 2.1-2.3    | 3      | 1-2h            | electron-vite is well-documented                  |
| 3.1-3.5    | 5      | 1-2h            | Simple React + Tailwind setup                     |
| 4.1-4.2    | 2      | 0.5-1h          | Minimal changes to IPC layer                      |
| 5.1-5.3    | 3      | 1-2h            | Workspace integration, Turbo config               |
| 6.1-6.7    | 7      | 2-3h            | Testing and verification                          |
| 7.1-7.2    | 2      | 0.5-1h          | Documentation                                     |
| 8.1-8.2    | 2      | 0.5-1h          | Cleanup and final checks                          |
| **Total**  | **27** | **8-15h**       | Depends on debugging speed and environment issues |

## Task Sequencing

**Must complete in order:**

1. Task Group 1 (Repository Setup)
2. Task Group 2 (Build Configuration)
3. Task Group 3 (React & Styling)
4. Task Group 4 (IPC Setup)
5. Task Groups 5-8 (Parallel or sequential)

**Can run in parallel after step 4:**

- Task Group 5: Monorepo Integration
- Task Group 6: Testing & Verification
- Task Group 7: Documentation
- Task Group 8: Cleanup

## Success Criteria Summary

Phase 1 is complete when:

1. ✓ `apps/desktop/` exists in monorepo with all neko code migrated
2. ✓ All tracker/substance/component code is removed
3. ✓ Minimal React shell renders successfully
4. ✓ Tailwind + @hominem/ui design system is loaded and functional
5. ✓ `bun run lint`, `bun run typecheck`, `bun run build` all pass
6. ✓ `bun run --filter @hominem/desktop dev` starts Electron with HMR
7. ✓ Electron window opens, shows "Desktop Shell" placeholder
8. ✓ No console errors, DevTools shows window.electronAPI available
9. ✓ Installer can be built with `bun run package`
10. ✓ Monorepo `bun run check` passes with desktop app included
