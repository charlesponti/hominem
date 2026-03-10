# Desktop Shell Foundation - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                       │
│  (src/main/index.ts)                                            │
│  - Window management                                            │
│  - IPC handlers (temporary, Phase 2: remove)                    │
│  - App lifecycle                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ IPC Bridge
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Preload Script                               │
│  (src/preload/index.ts)                                         │
│  - Exposes electronAPI to renderer                              │
│  - Type-safe IPC channel definitions                            │
│  - Security: contextBridge isolation                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ window.electronAPI
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   React Renderer                                │
│  (src/renderer/src/)                                            │
│                                                                  │
│  ├─ main.tsx (ReactDOM.createRoot)                             │
│  ├─ App.tsx (Minimal shell layout)                             │
│  ├─ globals.css (Import @hominem/ui/styles/globals.css)       │
│  └─ lib/context.ts (Electron detection + provider)            │
│                                                                  │
│  Dependencies:                                                  │
│  - React 19.1.0                                                │
│  - Tailwind CSS (via @tailwindcss/vite)                        │
│  - @hominem/ui (design system)                                 │
│  - @hominem/auth, hono-client, utils (Phase 2)                │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
apps/desktop/
├── src/
│   ├── main/
│   │   └── index.ts                    # Electron main process
│   │       ├── Create BrowserWindow
│   │       ├── Load preload script
│   │       ├── Basic IPC handlers
│   │       └── Window lifecycle
│   │
│   ├── preload/
│   │   └── index.ts                    # IPC bridge (minimal)
│   │       ├── ElectronAPI interface
│   │       ├── contextBridge.exposeInMainWorld
│   │       └── Type definitions
│   │
│   └── renderer/
│       ├── index.html                  # Entry point
│       └── src/
│           ├── main.tsx                # React entry (NEW)
│           │   └── ReactDOM.createRoot
│           ├── App.tsx                 # Shell layout (NEW)
│           │   ├── Minimal header
│           │   ├── Placeholder content area
│           │   └── Tailwind + @hominem/ui applied
│           ├── globals.css             # Tailwind imports (NEW)
│           │   └── @import '@hominem/ui/styles/globals.css'
│           └── lib/
│               └── context.ts          # Electron detection (NEW)
│                   └── useElectron hook
│
├── electron.vite.config.ts             # electron-vite build config
├── vite.config.ts                      # Vite config for tsconfig paths
├── tsconfig.json                       # Monorepo-aligned TypeScript config
├── electron-builder.yml                # Packaging config (macOS, Windows, Linux)
└── package.json                        # Monorepo-integrated workspace
```

## Key Design Decisions

### 1. Minimal IPC Surface

**Current (neko):**

- Broad API: getPossessions, createContainer, getSummary, getUsage, etc.
- ~20 IPC channels exposed

**New (Phase 1):**

- Minimal API: Platform info, window control, basic lifecycle
- ~3-5 IPC channels (platform detection, quit, etc.)
- **Reason**: All domain logic moves to Phase 2 with RPC

**Future (Phase 2):**

- Remove IPC entirely
- Use `@hominem/hono-client` for all data access
- **Preload becomes**: Just platform/environment info

### 2. Styling Strategy

**Neko's current approach:**

- Custom monochrome palette (black, white, grays)
- SF Mono font
- Dark mode only
- Terminal aesthetic

**Hominem's approach:**

- Premium dark theme (off-black with opacity-based elevation)
- Inter + JetBrains Mono typography
- Semantic color tokens
- Apple HIG influenced

**Decision: Full adoption of @hominem/ui**

- Import `@hominem/ui/styles/globals.css` in `renderer/src/globals.css`
- Override with desktop-specific rules if needed (e.g., custom titlebar styling)
- **Rationale**: Consistency across web, mobile, desktop. Monorepo standard.

**File: `src/renderer/src/globals.css`**

```css
@import '@hominem/ui/styles/globals.css';

/* Desktop-specific overrides (if needed) */
body {
  /* electron-specific adjustments */
}
```

### 3. Build Configuration

**electron-vite config alignment:**

- Keep electron-vite for Electron-specific build needs
- Add `vite.config.ts` for tsconfig path aliases (matches notes app)
- Ensure Tailwind plugin is loaded in renderer config
- Externalize dependencies properly (no bundling of native modules)

**Example: `electron.vite.config.ts`**

```typescript
import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // ... entry points
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    // ... entry points
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(), // NEW: Support @/* paths
    ],
    // ... build config
  },
});
```

### 4. TypeScript Configuration

**Alignment with monorepo:**

- Match `tsconfig.json` with other apps (notes, finance, rocco)
- Include path aliases for @hominem/\* imports
- Set `"noEmit": true` for development, let build tool handle emission

**Key settings:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/renderer/src/*"],
      "@hominem/*": ["../../packages/*", "../../services/*"]
    }
  }
}
```

### 5. Package.json Scripts

**Monorepo-aligned scripts:**

| Script        | Command                                                | Purpose                        |
| ------------- | ------------------------------------------------------ | ------------------------------ |
| `dev`         | `electron-vite dev`                                    | Start dev server with HMR      |
| `build`       | `electron-vite build`                                  | Build Electron + React bundles |
| `lint`        | `bunx oxlint ./src`                                    | Lint TypeScript/JSX            |
| `format`      | `bunx oxfmt ./src`                                     | Auto-format code               |
| `typecheck`   | `tsc --noEmit`                                         | Type check without emit        |
| `test`        | `vitest run --passWithNoTests`                         | Run unit tests                 |
| `package`     | `electron-builder --mac --arm64 --publish=never`       | Build DMG installer            |
| `package:all` | `electron-builder --mac --win --linux --publish=never` | All platforms                  |

**Why these choices:**

- Consistent with other apps (notes, finance)
- `oxlint` + `oxfmt` match monorepo linting
- `vitest` ready for future unit tests
- `electron-builder` for shipping

### 6. Minimal App.tsx

**Purpose:** Placeholder that proves the shell works

```typescript
import React from 'react'

export function App() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-bg-base text-text-primary">
      <h1 className="text-4xl font-bold">Desktop Shell</h1>
      <p className="mt-2 text-text-secondary">Ready for Phase 2</p>
    </div>
  )
}
```

**Why minimal:**

- Proves Tailwind + @hominem/ui tokens are loaded
- Proves React rendering works
- Proves build pipeline works
- Placeholder for Phase 2 content (notes logic)

### 7. Electron Lifecycle

**Main process (src/main/index.ts) responsibilities:**

```typescript
// 1. Create BrowserWindow
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  preload: path.join(__dirname, '../preload/index.js'),
  webPreferences: {
    preload: preloadPath,
    nodeIntegration: false,
    contextIsolation: true,
  },
});

// 2. Load renderer
if (isDev) {
  mainWindow.loadURL('http://localhost:5173'); // Dev server
} else {
  mainWindow.loadFile(path.join(__dirname, '../../build/index.html'));
}

// 3. Basic IPC handlers (minimal, Phase 2: remove)
ipcMain.handle('get-platform', () => process.platform);

// 4. App lifecycle
app.on('window-all-closed', () => app.quit());
```

### 8. Preload Script (Temporary)

**Purpose:** Expose minimal API to renderer

```typescript
import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  platform: NodeJS.Platform;
  getVersion: () => Promise<string>;
  quit: () => Promise<void>;
  // Phase 2: Remove tracker-specific handlers
}

const electronAPI: ElectronAPI = {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('get-version'),
  quit: () => ipcRenderer.invoke('quit'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

**Why minimal:**

- All data access moves to RPC in Phase 2
- Security best practice (limit what's exposed)
- Easier to remove when switching to hono-client

### 9. Build Output

**After `bun run build`:**

```
apps/desktop/build/
├── main/
│   └── index.js          # Electron main process bundle
├── preload/
│   └── index.js          # Preload script bundle
└── resources/
    └── renderer/         # React app bundle
        ├── index.html
        ├── main.js
        └── ...chunks
```

**Packaged installer (after `bun run package`):**

```
apps/desktop/release/
├── Hominem-1.0.0.dmg        # macOS installer
├── Hominem Setup 1.0.0.exe   # Windows installer
└── Hominem-1.0.0.AppImage    # Linux AppImage
```

## Dependencies: Why Each One

| Package                     | Version   | Purpose                                  | Removed Phase 2? |
| --------------------------- | --------- | ---------------------------------------- | ---------------- |
| `@hominem/ui`               | workspace | Design system, Tailwind tokens           | No               |
| `@hominem/auth`             | workspace | Auth utilities                           | No               |
| `@hominem/hono-client`      | workspace | RPC client (ready but unused in Phase 1) | No               |
| `@hominem/env`              | workspace | Env config                               | No               |
| `@hominem/utils`            | workspace | Shared utilities                         | No               |
| `electron`                  | 40.x      | Electron runtime                         | No               |
| `electron-vite`             | ^5.0.0    | Build tool                               | No               |
| `electron-builder`          | ^26.8.1   | Packaging                                | No               |
| `@electron-toolkit/preload` | ^3.0.2    | Preload utilities                        | No               |
| `@vitejs/plugin-react`      | 5.1.4     | JSX transform                            | No               |
| `@tailwindcss/vite`         | ^4.0.0    | Tailwind plugin                          | No               |
| `react`                     | 19.1.0    | UI framework                             | No               |
| `react-dom`                 | 19.1.0    | React DOM                                | No               |

## Development Workflow

### Starting Development

```bash
# From monorepo root
bun install

# Start dev server (electron + vite with HMR)
bun run --filter @hominem/desktop dev

# In another terminal, run typecheck/lint
bun run typecheck
bun run lint
```

### Hot Module Replacement (HMR)

- electron-vite provides HMR for renderer code
- Changes to src/renderer/src/\*.tsx reflect instantly
- Main process and preload require restart

### Building

```bash
# Build for development
bun run --filter @hominem/desktop build

# Build installers
bun run --filter @hominem/desktop package        # macOS
bun run --filter @hominem/desktop package:all    # All platforms
```

## Testing Strategy (Future)

**Phase 1:** No tests (shell is empty)

**Phase 2:** Add tests for:

- IPC communication (during transition)
- React component rendering
- Integration with @hominem/hono-client

**Tool:** Vitest (already configured in package.json)

```bash
bun run --filter @hominem/desktop test
```

## Security Considerations

### Preload Script Isolation

- ✓ Enabled `contextIsolation: true`
- ✓ Disabled `nodeIntegration`
- ✓ Only essential APIs exposed via contextBridge
- ✓ Type-safe electronAPI interface

### IPC Message Validation (Phase 2)

- Currently: No validation (shell is minimal)
- Future: Validate all IPC messages with Zod

### Content Security Policy (Future)

- Add CSP headers when Phase 2 loads remote content
- Restrict script sources, resource loading

## Performance Targets

### Startup Time

- Target: < 2 seconds from app launch to window visible
- Measure: `electron-vite dev` startup time

### Bundle Size

- React + Tailwind + @hominem/ui in Electron: ~3-4 MB (zipped)
- Monitor in Phase 2 when adding logic

### Memory Usage

- Target: < 150 MB at idle
- Current neko: ~80-100 MB

### Build Time

- Dev rebuild: < 1 second (with HMR)
- Full build: < 30 seconds

## Migration Path to Phase 2

**When Phase 2 starts:**

1. Create `packages/tracker-logic/` with shared business logic
2. Extract React components from `apps/notes` (if applicable)
3. Update `apps/desktop/src/renderer/src/App.tsx` to import from `packages/tracker-logic`
4. Replace IPC calls with `@hominem/hono-client` calls
5. Remove/simplify preload script as RPC takes over
6. Verify both web (`apps/notes`) and desktop (`apps/desktop`) share code

**Code sharing pattern:**

```typescript
// apps/desktop/src/renderer/src/App.tsx (Phase 2)
import { NotesApp } from '@hominem/tracker-logic/components'
import { useHonoQuery } from '@hominem/hono-client/react'

export function App() {
  return <NotesApp />
}
```

## References

- electron-vite docs: https://electron-vite.org/
- electron-builder docs: https://www.electron.build/
- @hominem/ui design system: `packages/ui/src/styles/globals.css`
- Existing web app pattern: `apps/notes/`
