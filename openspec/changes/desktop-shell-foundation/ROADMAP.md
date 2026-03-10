# Multi-Platform Unification Roadmap

## Vision

One codebase powering web, mobile, and desktop. Shared business logic, platform-specific shells.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                     HOMINEM MULTI-PLATFORM ARCHITECTURE                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │               packages/tracker-logic/                               │  │
│  │        (Shared business logic & components)                         │  │
│  │                                                                      │  │
│  │  ├─ hooks/        (useTracker, useNotes, useAuth, etc.)           │  │
│  │  ├─ components/   (Tracker UI, Notes UI, shared widgets)          │  │
│  │  ├─ api/          (RPC client hooks: useHonoQuery, etc.)          │  │
│  │  ├─ types/        (Shared types from @hominem/hono-rpc)           │  │
│  │  └─ utils/        (Utilities: validation, formatting, etc.)       │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│         ▲                           ▲                           ▲             │
│         │                           │                           │             │
│    Shared by                   Shared by                   Shared by          │
│         │                           │                           │             │
│  ┌──────┴─────────┐        ┌───────┴───────┐        ┌──────────┴─────────┐  │
│  │                │        │               │        │                    │  │
│  │  apps/notes    │        │ apps/mobile   │        │  apps/desktop      │  │
│  │  (Web)         │        │ (React Native)│        │  (Electron)        │  │
│  │                │        │               │        │                    │  │
│  │ ┌────────────┐ │        │ ┌──────────┐  │        │ ┌────────────────┐ │  │
│  │ │React       │ │        │ │React     │  │        │ │Electron Main   │ │  │
│  │ │Router      │ │        │ │Native    │  │        │ │Preload Bridge  │ │  │
│  │ ├────────────┤ │        │ ├──────────┤  │        │ ├────────────────┤ │  │
│  │ │React       │ │        │ │React     │  │        │ │React Renderer  │ │  │
│  │ │Components  │ │        │ │Components│  │        │ │(Embedded)      │ │  │
│  │ ├────────────┤ │        │ ├──────────┤  │        │ ├────────────────┤ │  │
│  │ │@hono-      │ │        │ │@hono-    │  │        │ │@hono-client    │ │  │
│  │ │client RPC  │ │        │ │client RPC│  │        │ │RPC calls       │ │  │
│  │ │Calls       │ │        │ │Calls     │  │        │ │(Phase 2)       │ │  │
│  │ └────────────┘ │        │ └──────────┘  │        │ └────────────────┘ │  │
│  │                │        │               │        │                    │  │
│  │ Deployment:    │        │ Deployment:   │        │ Deployment:        │  │
│  │ Web server     │        │ App Stores    │        │ DMG/NSIS/AppImage  │  │
│  │ PWA            │        │ (iOS/Android) │        │ (macOS/Win/Linux)  │  │
│  └────────────────┘        └───────────────┘        └────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │                    services/api (Backend)                           │  │
│  │                 @hominem/hono-rpc endpoints                         │  │
│  │                                                                      │  │
│  │  ├─ Routes: /api/notes, /api/tracker, /api/auth                   │  │
│  │  ├─ Database: PostgreSQL + Kysely (Phase: migrate-to-kysely-atlas)│  │
│  │  └─ Auth: Better Auth (CLI Bridge, Passkeys, Email OTP)           │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Timeline: Three Phases

### Phase 1: Desktop Shell Foundation (NOW - 8-15 hours)

**Goal**: Build a clean, optimized Electron shell

```
PHASE 1
├─ Copy neko → apps/desktop/
├─ Delete all domain code
├─ Create minimal React shell
├─ Integrate @hominem/ui design system
├─ Verify builds, typechecks, runs
└─ RESULT: apps/desktop/ ready for Phase 2

Status: Not started
Timeline: 1-2 weeks
Artifacts:
  • apps/desktop/ (minimal Electron app)
  • Tailwind + @hominem/ui integrated
  • 27 tasks documented
  • Ready for Phase 2 logic
```

### Phase 2: Shared Logic Layer (AFTER Phase 1 - estimated 2-3 weeks)

**Goal**: Unify business logic between web and desktop

```
PHASE 2
├─ Create packages/tracker-logic/
│  ├─ Extract shared components (Tracker UI, Notes UI)
│  ├─ Extract shared hooks (useTracker, useNotes, useAuth)
│  ├─ Create RPC client wrappers (useHonoQuery for tracker)
│  └─ Create shared types from @hominem/hono-rpc
├─ Update apps/notes/
│  ├─ Import from packages/tracker-logic
│  ├─ Use shared components and hooks
│  └─ Verify web still works
├─ Update apps/desktop/
│  ├─ Import from packages/tracker-logic
│  ├─ Replace IPC with @hominem/hono-client
│  ├─ Use shared components and hooks
│  └─ Verify desktop works
└─ RESULT: Web + Desktop share code

Status: Proposed (pending Phase 1)
Timeline: 2-3 weeks
Artifacts:
  • packages/tracker-logic/ (shared code)
  • apps/notes/ updated to use shared code
  • apps/desktop/ updated to use shared code
  • Both platforms have same business logic
```

### Phase 3: Platform Optimizations (FUTURE - ongoing)

**Goal**: Leverage platform-specific capabilities while maintaining shared core

```
PHASE 3
├─ Desktop optimizations
│  ├─ System tray integration
│  ├─ Native menus and shortcuts
│  ├─ File system access
│  ├─ Offline-first with sync
│  └─ Background processes
├─ Web optimizations
│  ├─ PWA features
│  ├─ Service worker caching
│  ├─ Offline support
│  └─ Mobile responsive design
├─ Mobile optimizations
│  ├─ Native navigation
│  ├─ Push notifications
│  ├─ Biometric auth
│  └─ Camera/microphone access
└─ RESULT: Best-in-class experience on each platform

Status: Future
Timeline: Ongoing (after Phase 2)
Artifacts:
  • Platform-specific code separated from shared logic
  • Each platform leverages native capabilities
  • Shared core business logic remains identical
```

## Current State → Future State

### Before Phase 1

```
~/Developer/neko/                (Isolated)
  ├─ src/renderer/src/
  │  ├─ components/              (Tracker-specific UI)
  │  ├─ hooks/                   (Local state management)
  │  └─ App.tsx                  (Domain logic + IPC + React)
  ├─ src/main/                   (Electron setup)
  ├─ src/preload/                (IPC bridge)
  └─ package.json                (tracker deps: base-ui, chart.js, etc.)

apps/notes/                       (Web, independent)
  ├─ app/routes/                 (Notes routes)
  ├─ app/components/             (Notes UI)
  └─ app/lib/                    (Notes hooks)

❌ No code sharing
❌ Duplicate logic
❌ Desktop isolated from monorepo
```

### After Phase 1 (This Change)

```
apps/desktop/                     (Electron, minimal shell)
  ├─ src/renderer/src/
  │  ├─ App.tsx                  (Empty placeholder)
  │  ├─ main.tsx                 (ReactDOM.createRoot)
  │  └─ globals.css              (Imports @hominem/ui)
  ├─ src/main/                   (Electron setup)
  ├─ src/preload/                (Minimal IPC bridge)
  └─ package.json                (no domain deps)

apps/notes/                       (Web, unchanged for now)
  ├─ app/routes/                 (Notes routes)
  ├─ app/components/             (Notes UI)
  └─ app/lib/                    (Notes hooks)

✓ Desktop in monorepo
✓ Monorepo tooling integrated
✗ Still no code sharing (Phase 2)
```

### After Phase 2 (Future)

```
packages/tracker-logic/          (NEW: Shared business logic)
  ├─ components/
  │  ├─ Tracker.tsx             (Shared tracker UI)
  │  ├─ Notes.tsx               (Shared notes UI)
  │  └─ ...shared widgets
  ├─ hooks/
  │  ├─ useTracker.ts           (Shared tracker logic)
  │  ├─ useNotes.ts             (Shared notes logic)
  │  ├─ useAuth.ts              (Shared auth)
  │  └─ ...other hooks
  ├─ api/
  │  ├─ tracker.ts              (@hominem/hono-client wrappers)
  │  ├─ notes.ts
  │  └─ auth.ts
  └─ types/
     └─ index.ts                (From @hominem/hono-rpc)

apps/notes/                       (Web)
  ├─ app/routes/                (Routes using tracker-logic)
  ├─ app/lib/                   (Platform-specific web code)
  └─ imports from packages/tracker-logic

apps/desktop/                     (Electron)
  ├─ src/renderer/src/
  │  ├─ App.tsx                 (Imports from tracker-logic)
  │  └─ lib/                    (Platform-specific Electron code)
  └─ imports from packages/tracker-logic

✓ Code shared between web and desktop
✓ Same business logic, different shells
✓ RPC client (@hominem/hono-client) used consistently
```

## Task Dependencies

```
Phase 1 (Desktop Shell Foundation) - BLOCKING
└─ All 27 tasks must complete

     ├─ Task Group 1: Repository Setup (3 tasks)
     │  └─ BLOCKS Task Group 2
     │
     ├─ Task Group 2: Build Configuration (3 tasks)
     │  └─ BLOCKS Task Group 3
     │
     ├─ Task Group 3: React & Styling (5 tasks)
     │  └─ BLOCKS Task Group 6
     │
     └─ Task Group 4-8: Can run in parallel after Task Group 3

                              ↓

Phase 2 (Shared Logic Layer) - Can start only after Phase 1 complete
├─ Create packages/tracker-logic/
├─ Extract shared components from apps/notes
├─ Share components between apps/notes and apps/desktop
└─ Replace IPC with RPC client

                              ↓

Phase 3 (Platform Optimizations) - Can start only after Phase 2
├─ Add desktop-specific features
├─ Add web-specific features
├─ Add mobile-specific features (if applicable)
└─ Ongoing optimization
```

## Success Metrics

### Phase 1 Success

- ✓ `apps/desktop/` exists and is buildable
- ✓ `bun run check` passes with desktop included
- ✓ Electron window opens with React shell
- ✓ No console errors or type mismatches
- ✓ Installer can be created for all platforms

### Phase 2 Success

- ✓ `packages/tracker-logic/` exists with shared components
- ✓ `apps/notes/` uses shared components successfully
- ✓ `apps/desktop/` uses shared components successfully
- ✓ Both apps share identical business logic
- ✓ RPC calls work from both platforms
- ✓ Feature parity: both web and desktop have same functionality

### Phase 3 Success

- ✓ Desktop has platform-specific optimizations (system tray, native menus, etc.)
- ✓ Web has platform-specific optimizations (PWA, offline, responsive)
- ✓ Mobile has platform-specific optimizations (native nav, biometric, etc.)
- ✓ Shared core logic unchanged
- ✓ No regressions from Phase 2 baseline

## Design System Integration

### Phase 1: Import & Verify

```typescript
// apps/desktop/src/renderer/src/globals.css
@import '@hominem/ui/styles/globals.css';
@import '@hominem/ui/styles/animations.css';

// Tailwind tokens now available:
// - bg-bg-base, bg-bg-surface, bg-bg-elevated
// - text-text-primary, text-text-secondary, text-text-tertiary
// - border-border-default, border-border-subtle
// - All typography, spacing, animations
```

### Phase 2: Shared Components

```typescript
// packages/tracker-logic/components/Tracker.tsx
import { Button } from '@hominem/ui/components'
import { useTracker } from '../hooks/useTracker'

export function Tracker() {
  const { data, isLoading } = useTracker()
  return (
    <div className="space-y-4">
      {/* Uses @hominem/ui components + Tailwind tokens */}
      {data.map(item => (
        <div key={item.id} className="bg-bg-surface rounded-lg p-4">
          <h3 className="text-text-primary font-semibold">{item.name}</h3>
          <Button>Add</Button>
        </div>
      ))}
    </div>
  )
}
```

### Phase 3: Platform-Specific Styling

```typescript
// apps/desktop/src/renderer/src/lib/themes.ts
// Override or extend @hominem/ui tokens for desktop-specific needs

// apps/notes/app/lib/themes.ts
// Override or extend @hominem/ui tokens for web-specific needs
```

## RPC Integration Path

### Phase 1: Placeholder (No RPC)

```typescript
// apps/desktop/src/renderer/src/App.tsx
export function App() {
  return <div>Desktop Shell (Phase 2: RPC calls here)</div>
}
```

### Phase 2: RPC Enabled

```typescript
// apps/desktop/src/renderer/src/App.tsx
import { useHonoQuery } from '@hominem/hono-client/react'

export function App() {
  const { data: tracker } = useHonoQuery(['tracker'], async (client) => {
    const res = await client.api.tracker.$get()
    return res.json()
  })

  return <Tracker data={tracker} />
}

// Same hooks used in apps/notes for consistency
// Both call the same RPC endpoints
// Same response types from @hominem/hono-rpc
```

## Key Principles

1. **Shared Core**: Business logic, components, hooks live in `packages/tracker-logic/`
2. **Platform Shells**: Each platform (web, desktop, mobile) is a thin shell around shared core
3. **RPC-First**: All data access goes through `@hominem/hono-client` (Phase 2+)
4. **Design System**: All platforms use `@hominem/ui` for consistency
5. **Type Safety**: Shared types from `@hominem/hono-rpc` throughout
6. **Progressive Enhancement**: Phase 1 = foundation, Phase 2 = core, Phase 3 = optimization

## File Structure Vision (After Phase 2)

```
hominem/
├── apps/
│   ├── notes/                 (Web)
│   ├── mobile/                (React Native)
│   ├── desktop/               (Electron) ← Phase 1
│   └── rocco/
│
├── packages/
│   ├── tracker-logic/         (NEW Phase 2)
│   │   ├── components/        (Shared UI)
│   │   ├── hooks/             (Shared logic)
│   │   ├── api/               (RPC wrappers)
│   │   └── types/             (Shared types)
│   ├── ui/                    (Design system)
│   ├── hono-client/           (RPC client)
│   ├── hono-rpc/              (RPC types)
│   └── ...other packages
│
├── services/
│   └── api/                   (Backend)
│
└── openspec/
    └── changes/
        ├── desktop-shell-foundation/  (Phase 1 - THIS CHANGE)
        ├── shared-logic-layer/        (Phase 2 - FUTURE)
        ├── platform-optimizations/    (Phase 3 - FUTURE)
        └── ...other changes
```

## Next Steps

1. **Now**: Review this proposal (Phase 1)
2. **Week 1**: Implement Phase 1 (8-15 hours, 27 tasks)
3. **Week 2-3**: Design Phase 2 (shared logic layer)
4. **Week 3+**: Implement Phase 2
5. **After Phase 2**: Begin Phase 3 optimizations

## Risks & Mitigations

| Risk                                   | Probability | Impact | Mitigation                                           |
| -------------------------------------- | ----------- | ------ | ---------------------------------------------------- |
| Electron version conflicts             | Medium      | High   | Test 40.x with monorepo deps early                   |
| Build performance                      | Medium      | Medium | Benchmark electron-vite + Tailwind, optimize if slow |
| Bundle size explosion                  | Low         | Medium | Accept Phase 1, optimize in Phase 3                  |
| RPC integration delays Phase 2         | Low         | High   | Prototype RPC calls during Phase 1                   |
| Design system doesn't work in Electron | Low         | High   | Test @hominem/ui in electron-vite early              |

## Questions

1. **Mobile**: Should `apps/mobile` also use `packages/tracker-logic/` in Phase 2?
2. **Offline**: Should Phase 3 include offline-first sync for desktop?
3. **Timeline**: Is 8-15 hours for Phase 1 realistic given your bandwidth?
4. **Scope**: Should Phase 2 include mobile, or just web + desktop?
5. **Deployment**: How will desktop updates be handled (auto-update, manual download)?

## References

- **Phase 1 Proposal**: `openspec/changes/desktop-shell-foundation/proposal.md`
- **Phase 1 Design**: `openspec/changes/desktop-shell-foundation/design.md`
- **Phase 1 Tasks**: `openspec/changes/desktop-shell-foundation/tasks.md`
- **Neko Source**: `~/Developer/neko/`
- **Notes App**: `hominem/apps/notes/`
- **Design System**: `hominem/packages/ui/src/styles/globals.css`

---

**Ready to start Phase 1?** Begin with `openspec/changes/desktop-shell-foundation/proposal.md`.
