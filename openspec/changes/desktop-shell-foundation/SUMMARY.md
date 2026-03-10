# Desktop Shell Foundation - Executive Summary

## What This Is

A two-phase initiative to integrate neko (a standalone Electron desktop app) into the hominem monorepo as `apps/desktop`, establish a clean foundation, and then unify business logic across web (`apps/notes`) and desktop platforms.

**Phase 1 (this change):** Build an optimized, minimal Electron shell
**Phase 2 (future):** Share business logic between web and desktop

## The Problem We're Solving

- **Isolation**: Neko exists outside the monorepo with its own build pipeline
- **Duplication**: Can't share code between web and desktop versions
- **Maintenance**: Tracker logic is mixed with UI, IPC, and Electron complexity
- **Multi-platform vision**: We want one codebase powering web, mobile, and desktop

## What We're Building

### Phase 1: Desktop Shell Foundation (8-15 hours)

A lean, optimized Electron app that:

- ✓ Lives in `apps/desktop/` as a workspace app
- ✓ Uses monorepo's design system (@hominem/ui, Tailwind)
- ✓ Integrated with Turbo build system and Bun workspaces
- ✓ Minimal IPC layer (temporary, removed in Phase 2)
- ✓ No domain-specific code (tracker functionality deleted)
- ✓ Ready for Phase 2 logic integration

**Success**: Window opens, renders "Desktop Shell" placeholder with correct styling, builds for macOS/Windows/Linux.

### Phase 2: Shared Logic Layer (future)

Once Phase 1 is solid:

- Create `packages/tracker-logic/` with shared business logic
- Share React components between `apps/notes` (web) and `apps/desktop` (desktop)
- Replace Electron IPC with `@hominem/hono-client` RPC calls
- Unify auth, styling, data fetching across platforms

## Architecture

```
Electron Main Process (src/main/)
        ↓
    IPC Bridge (src/preload/)
        ↓
React Renderer (src/renderer/src/)
├── App.tsx (minimal shell)
├── globals.css (imports @hominem/ui)
└── main.tsx (ReactDOM.createRoot)

Build Pipeline:
├── electron-vite (build tool)
├── @tailwindcss/vite (styling)
├── @vitejs/plugin-react (JSX)
└── electron-builder (packaging)
```

## Key Decisions

| Decision                                   | Rationale                                                             |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Full adoption of @hominem/ui design system | Consistency across all platforms (web, mobile, desktop)               |
| Keep Electron IPC (temporarily)            | Simplifies Phase 1; removes in Phase 2 when RPC takes over            |
| Delete all tracker code                    | Forces clean separation; Phase 2 adds logic back with shared approach |
| Minimal preload API                        | Security best practice; easier to remove later                        |
| electron-vite for build                    | Electron-native tooling; proven in production apps                    |

## What Gets Deleted

Everything domain-specific from neko:

- ❌ `src/renderer/src/components/` (dialogs, charts, forms)
- ❌ `src/renderer/src/App.tsx` (tracker UI)
- ❌ `src/shared/` (temporary utilities)
- ❌ Dependencies: base-ui, chart.js, motion, yaml, sql.js

## What Stays

Infrastructure and build setup:

- ✓ `src/main/index.ts` (Electron process)
- ✓ `src/preload/index.ts` (IPC bridge, simplified)
- ✓ `electron.vite.config.ts` (build config)
- ✓ `public/` (assets, icons)
- ✓ Build config: electron-builder.yml

## Dependencies Added

| Package                | Version   | Why                                                  |
| ---------------------- | --------- | ---------------------------------------------------- |
| `@hominem/ui`          | workspace | Design system (Tailwind tokens, typography, spacing) |
| `@hominem/auth`        | workspace | Auth utilities (for Phase 2)                         |
| `@hominem/hono-client` | workspace | RPC client (for Phase 2)                             |
| `@hominem/env`         | workspace | Environment config                                   |
| `electron`             | 40.x      | Electron runtime                                     |
| `electron-vite`        | ^5.0.0    | Build tool                                           |
| `@tailwindcss/vite`    | ^4.0.0    | Tailwind plugin                                      |

## Timeline

**Estimated**: 8-15 hours

**Breakdown**:

- Repository setup: 1-2h
- Build configuration: 1-2h
- React & styling: 1-2h
- IPC & Electron: 0.5-1h
- Monorepo integration: 1-2h
- Testing & verification: 2-3h
- Documentation: 0.5-1h
- Cleanup & final checks: 0.5-1h

## Success Criteria

Phase 1 is complete when:

1. ✓ `apps/desktop/` exists in monorepo with neko code migrated
2. ✓ All tracker/substance/component code is removed
3. ✓ Minimal React shell renders successfully
4. ✓ Tailwind + @hominem/ui design system is loaded
5. ✓ `bun run lint`, `bun run typecheck`, `bun run build` pass
6. ✓ `bun run --filter @hominem/desktop dev` opens Electron window
7. ✓ "Desktop Shell" placeholder renders with correct styling
8. ✓ `bun run --filter @hominem/desktop package` builds installer
9. ✓ No console errors; DevTools shows window.electronAPI available
10. ✓ Ready for Phase 2 logic integration

## Risks & Unknowns

| Risk                                              | Mitigation                                        |
| ------------------------------------------------- | ------------------------------------------------- |
| Electron version conflicts                        | Verify 40.x compatibility with monorepo deps      |
| Build performance (electron-vite + Tailwind)      | Benchmark; optimize if rebuilds are slow          |
| Turbo integration (electron-vite != React Router) | Careful script setup; test all Turbo tasks        |
| Bundle size explosion                             | Accept for Phase 1; optimize in Phase 3           |
| HMR differences from React Router                 | electron-vite has different HMR model; acceptable |

## What's NOT in Scope

- ❌ Functionality restoration (tracker features)
- ❌ RPC integration (happens in Phase 2)
- ❌ Platform-specific optimizations
- ❌ Unit tests (Phase 2)
- ❌ Desktop-specific features (system tray, native menus)

## Next Steps (Phase 2)

Once Phase 1 is complete:

1. Create `packages/tracker-logic/` with shared business logic
2. Extract and unify React components
3. Replace IPC calls with `@hominem/hono-client`
4. Verify both `apps/notes` (web) and `apps/desktop` (desktop) share the same logic
5. Activate Phase 2 as new OpenSpec change

## References

- **Neko source**: `~/Developer/neko/`
- **Design document**: `openspec/changes/desktop-shell-foundation/design.md`
- **Tasks**: `openspec/changes/desktop-shell-foundation/tasks.md`
- **Monorepo notes app**: `apps/notes/`
- **Monorepo design system**: `packages/ui/src/styles/globals.css`
- **Electron best practices**: https://www.electronjs.org/docs/latest/
- **electron-vite docs**: https://electron-vite.org/

## Questions?

This proposal is ready for feedback. Key decision points:

1. **Design system adoption**: Fully adopt @hominem/ui or hybrid approach?
2. **Timeline**: Is 8-15 hours reasonable given your bandwidth?
3. **Phase 2 scope**: Do notes and desktop need identical logic, or platform-specific variations?
4. **Build process**: Any concerns about electron-vite in the monorepo?

Ready to implement?
