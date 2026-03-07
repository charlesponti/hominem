# Desktop Shell Foundation - Progress Tracker

## Phase 1: Desktop Shell Foundation

Status: **Not Started**

### Task Group 1: Repository Setup

- [ ] 1.1: Copy neko to apps/desktop
  - [ ] Copy ~/Developer/neko/ → hominem/apps/desktop/
  - [ ] Preserve src/main/, src/preload/, electron.vite.config.ts
  - [ ] Delete src/renderer/src/ domain code
  - [ ] Delete src/shared/
  - [ ] Keep public/ with assets
  - Status: Not started

- [ ] 1.2: Update package.json for monorepo
  - [ ] Set name to @hominem/desktop
  - [ ] Set private: true
  - [ ] Update scripts (lint, format, typecheck, test, build, dev)
  - [ ] Update @hominem dependencies to workspace:\*
  - [ ] Remove tracker-specific deps (base-ui, chart.js, motion, yaml)
  - [ ] Add @hominem/auth, env, hono-client, ui, utils
  - [ ] Verify bun install succeeds
  - Status: Not started

- [ ] 1.3: Update tsconfig.json
  - [ ] Match compiler options with apps/notes/tsconfig.json
  - [ ] Add @/\* path aliases
  - [ ] Add @hominem/\* path aliases
  - [ ] Set noEmit: true
  - [ ] Enable strict mode
  - [ ] Set skipLibCheck: true
  - [ ] Verify bun run typecheck works
  - Status: Not started

### Task Group 2: Build Configuration

- [ ] 2.1: Update electron.vite.config.ts
  - [ ] Add vite-tsconfig-paths plugin
  - [ ] Ensure @tailwindcss/vite loaded
  - [ ] Ensure @vitejs/plugin-react loaded first
  - [ ] Keep externalizeDepsPlugin for main/preload
  - [ ] Update renderer root path
  - [ ] Verify build succeeds
  - Status: Not started

- [ ] 2.2: Create vite.config.ts
  - [ ] Create apps/desktop/vite.config.ts
  - [ ] Add tsconfigPaths plugin
  - [ ] Minimal config for alias support
  - Status: Not started

- [ ] 2.3: Configure electron-builder
  - [ ] Set appId to com.hominem.desktop
  - [ ] Set productName to Hominem
  - [ ] Configure macOS DMG (arm64 + x64)
  - [ ] Configure Windows NSIS
  - [ ] Configure Linux AppImage
  - [ ] Verify package command works
  - Status: Not started

### Task Group 3: React & Styling Setup

- [ ] 3.1: Delete old domain code from renderer
  - [ ] Delete src/renderer/src/components/
  - [ ] Delete src/renderer/src/App.tsx
  - [ ] Delete src/renderer/src/style.css
  - [ ] Delete src/renderer/src/main.tsx (will recreate)
  - [ ] Keep src/renderer/index.html and public/
  - Status: Not started

- [ ] 3.2: Create minimal src/renderer/src/main.tsx
  - [ ] Create main.tsx with ReactDOM.createRoot
  - [ ] Import App component
  - [ ] Import globals.css
  - [ ] Verify no type errors
  - Status: Not started

- [ ] 3.3: Create minimal src/renderer/src/App.tsx
  - [ ] Create placeholder component
  - [ ] Display "Desktop Shell" heading
  - [ ] Use @hominem/ui Tailwind tokens (bg-bg-base, text-text-primary, etc)
  - [ ] Verify renders without errors
  - Status: Not started

- [ ] 3.4: Create src/renderer/src/globals.css
  - [ ] Import @hominem/ui/styles/globals.css
  - [ ] Import @hominem/ui/styles/animations.css
  - [ ] Add desktop-specific overrides if needed
  - [ ] Verify tokens are available
  - Status: Not started

- [ ] 3.5: Update src/renderer/index.html
  - [ ] Set title to Hominem
  - [ ] Ensure root div with id="root"
  - [ ] Add script tag for /src/main.tsx
  - [ ] Remove hardcoded styles
  - Status: Not started

### Task Group 4: IPC & Electron Setup (Minimal)

- [ ] 4.1: Review and keep src/main/index.ts
  - [ ] Verify BrowserWindow creation
  - [ ] Verify preload script path correct
  - [ ] Verify contextIsolation and nodeIntegration settings
  - [ ] Keep basic IPC handlers (minimal)
  - [ ] Remove tracker-specific handlers
  - [ ] Verify main process starts
  - [ ] Verify BrowserWindow opens
  - Status: Not started

- [ ] 4.2: Review and keep src/preload/index.ts
  - [ ] Remove tracker-specific handlers
  - [ ] Keep only platform info and basic lifecycle
  - [ ] Minimal ElectronAPI interface
  - [ ] Include type declarations
  - [ ] Verify preload compiles
  - [ ] Verify window.electronAPI available in DevTools
  - Status: Not started

### Task Group 5: Monorepo Integration

- [ ] 5.1: Verify apps/desktop is in workspace
  - [ ] Confirm package.json workspaces includes apps/\*
  - [ ] Run bun install from root
  - [ ] Verify node_modules linking
  - [ ] Verify bun run --filter @hominem/desktop --list shows app
  - Status: Not started

- [ ] 5.2: Add Turbo tasks
  - [ ] Verify build task includes desktop
  - [ ] Verify lint task includes desktop
  - [ ] Verify typecheck task includes desktop
  - [ ] Verify dev task can target @hominem/desktop
  - [ ] Test bun run build succeeds
  - [ ] Test bun run lint succeeds
  - [ ] Test bun run typecheck succeeds
  - [ ] Test bun run dev --filter @hominem/desktop works
  - Status: Not started

- [ ] 5.3: Add to .gitignore (if needed)
  - [ ] Verify build/, out/, release/, dist/ are ignored
  - [ ] Verify git status clean
  - Status: Not started

### Task Group 6: Testing & Verification

- [ ] 6.1: Lint & Format
  - [ ] Run bun run --filter @hominem/desktop lint
  - [ ] Run bun run --filter @hominem/desktop format
  - [ ] Fix any violations
  - [ ] Verify no new errors
  - Status: Not started

- [ ] 6.2: Type Check
  - [ ] Run bun run --filter @hominem/desktop typecheck
  - [ ] Fix any type errors
  - [ ] Verify @hominem/\* imports resolve
  - [ ] No "Cannot find module" errors
  - Status: Not started

- [ ] 6.3: Build
  - [ ] Run bun run --filter @hominem/desktop build
  - [ ] Verify build/ directory created
  - [ ] Verify main.js, preload.js, renderer files exist
  - [ ] Build completes in < 30 seconds
  - [ ] No build errors
  - Status: Not started

- [ ] 6.4: Dev Server
  - [ ] Run bun run --filter @hominem/desktop dev
  - [ ] Verify "http://localhost:5173" message
  - [ ] Electron window opens automatically
  - [ ] React content renders
  - [ ] Open DevTools (Cmd+Option+I)
  - [ ] Verify window.electronAPI available
  - [ ] Verify Tailwind classes applied
  - [ ] Verify no console errors
  - [ ] "Desktop Shell" heading visible
  - [ ] Text in correct color (@hominem/ui tokens)
  - [ ] window.electronAPI.platform returns correct value
  - Status: Not started

- [ ] 6.5: HMR Test
  - [ ] Start dev server
  - [ ] Edit App.tsx heading text
  - [ ] Save file
  - [ ] Verify window updates without full reload
  - [ ] HMR completes in < 1 second
  - [ ] No error stack traces in DevTools
  - [ ] DevTools state preserved
  - Status: Not started

- [ ] 6.6: Package Verification
  - [ ] Run bun run --filter @hominem/desktop build
  - [ ] Run bun run --filter @hominem/desktop package
  - [ ] Verify .dmg (macOS) created in release/
  - [ ] Installer is > 50MB (includes Electron + bundle)
  - [ ] Build completes without errors
  - Status: Not started

- [ ] 6.7: Full Monorepo Check
  - [ ] Run bun run check from root
  - [ ] Verify all tasks complete
  - [ ] Verify no new errors in other apps
  - [ ] bun run build includes desktop and succeeds
  - [ ] bun run test includes desktop and passes
  - Status: Not started

### Task Group 7: Documentation

- [ ] 7.1: Add README
  - [ ] Create apps/desktop/README.md
  - [ ] Document purpose (desktop shell foundation)
  - [ ] Quick start (bun install, bun run dev)
  - [ ] Build instructions (bun run build, bun run package)
  - [ ] Development tips (DevTools, HMR, troubleshooting)
  - [ ] Architecture overview (main, preload, renderer)
  - [ ] Phase 2 notes
  - [ ] New developer can follow and run the app
  - Status: Not started

- [ ] 7.2: Update monorepo README (if needed)
  - [ ] Add apps/desktop/ to apps list
  - [ ] Note that it's currently a shell (Phase 1)
  - [ ] Link to Phase 2 proposal for context
  - Status: Not started

### Task Group 8: Cleanup & Final Checks

- [ ] 8.1: Clean up neko repo
  - [ ] Decide on neko directory (keep or archive)
  - [ ] Document canonical source is apps/desktop/
  - Status: Not started

- [ ] 8.2: Final smoke test
  - [ ] bun install succeeds
  - [ ] bun run lint passes
  - [ ] bun run format makes no changes
  - [ ] bun run typecheck passes
  - [ ] bun run check passes
  - [ ] bun run --filter @hominem/desktop dev starts and opens window
  - [ ] Window renders "Desktop Shell" with correct styling
  - [ ] bun run --filter @hominem/desktop build succeeds
  - [ ] bun run --filter @hominem/desktop package creates installer
  - [ ] No console errors or warnings in DevTools
  - [ ] Ready to activate next change (Phase 2)
  - Status: Not started

## Summary

- **Total Tasks**: 27
- **Completed**: 0
- **In Progress**: 0
- **Blocked**: 0
- **Total Estimated Hours**: 8-15h

## Notes

- Phase 1 focuses on building the shell, not functionality
- All tracker code is deleted; Phase 2 will restore functionality with shared logic
- IPC layer is minimal and temporary; Phase 2 will replace with @hominem/hono-client
- Build pipeline is tested end-to-end (dev, build, package)
- Ready to start Phase 2 once all tasks complete

## Phase 2 Preview

Once Phase 1 is complete:

1. Create packages/tracker-logic/ with shared business logic
2. Extract React components from apps/notes (if applicable)
3. Share code between apps/notes (web) and apps/desktop (desktop)
4. Replace IPC calls with @hominem/hono-client RPC calls
5. Unify auth, styling, and data fetching across both platforms
