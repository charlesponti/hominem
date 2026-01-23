# TypeScript Architecture

## Overview

This monorepo uses the **"Internal Packages" pattern** for TypeScript configuration, which is the modern best practice for monorepos as of 2025/2026. This approach prioritizes developer experience while maintaining type safety.

## Strategy: Internal Packages

### What This Means

- **No path mappings** in tsconfig for workspace packages
- **No project references** between packages
- **Workspace resolution** via Bun (native support)
- **Source files** used during development
- **Built files** used for production
- **TypeScript LSP** handles in-memory type generation

### Why This Approach

✅ **Benefits:**

- Zero build time for local development
- Instant type updates across packages when you change a file
- No editor vs build discrepancy - what you see in the IDE is what the build produces
- Simpler configuration with fewer moving parts
- Perfect for Bun which natively supports workspace resolution
- Recommended by modern tooling (Turborepo, Vite, etc.)
- Scales well for small to medium monorepos (~50 packages)

✅ **Fit for This Codebase:**

- ~16 packages (not 100+, so don't need heavy incremental build optimization)
- Using Bun (has native workspace support)
- Already using Turbo for build orchestration (provides dependency tracking)
- Focus on developer velocity

## Architecture

### Directory Structure

```
hominem/
├── packages/              # Core packages (16 packages)
│   ├── ai/
│   ├── auth/
│   ├── db/
│   ├── finance/
│   ├── jobs/
│   ├── services/
│   ├── trpc/
│   ├── utils/
│   └── ... (11 more)
├── apps/                  # Applications (3 apps)
│   ├── finance/
│   ├── notes/
│   └── rocco/
├── services/              # Services (2 services)
│   ├── api/
│   └── workers/
├── tools/                 # Tools (1 tool)
│   └── cli/
├── tsconfig.base.json     # Root TypeScript configuration
└── tsconfig.json          # Root project references (optional, for `tsc --build`)
```

### TypeScript Configuration

#### Root Configuration (`tsconfig.base.json`)

The base configuration contains compiler options shared by all packages:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "composite": true,
    "disableSourceOfProjectReferenceRedirect": true
  }
}
```

**Key settings:**

- `moduleResolution: "Bundler"` - Optimized for Bun and bundlers
- `declaration: true` - Generate `.d.ts` files for production
- `declarationMap: true` - Enables "Go to Definition" to navigate to source files
- `disableSourceOfProjectReferenceRedirect: true` - Uses declaration files when available

#### Package Configuration (`packages/*/tsconfig.json`)

Each package extends the base configuration:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "./build",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

**Pattern:**

- All packages extend `tsconfig.base.json`
- No `references` arrays (Bun handles dependencies)
- All packages build to `./build` directory
- All packages use `src` as root

#### App/Service Configuration (`apps/*/tsconfig.json`)

Apps and services have `noEmit: true` (they don't generate `.d.ts`):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "paths": {
      "~/*": ["./app/*"]
    }
  }
}
```

**Pattern:**

- Extend base configuration
- Set `noEmit: true` (no build output)
- Define local path mappings (e.g., `~/*`)
- No project references

### Module Resolution at Runtime

#### Development (Editor & `bun run`)

1. Bun workspace resolver finds `@hominem/*` packages
2. Reads `package.json` exports for the package
3. Uses `development` condition if available, falls back to types/default
4. Points to source files (`.ts`) for instant updates

**Example from `packages/db/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./build/index.d.ts",
      "development": "./src/index.ts",
      "default": "./build/index.js"
    }
  }
}
```

#### Production Build

1. TypeScript builds each package independently
2. Generates `.d.ts` files in `./build` directory
3. Package.json exports point to built files
4. Consumers import from built output

### Build Process

```mermaid
graph LR
    A["bun run build"] -->|Turbo orchestration| B["Build packages/utils"]
    B -->|outputs to ./build| C["Build packages/db"]
    C -->|outputs to ./build| D["Build packages/finance"]
    D -->|outputs to ./build| E["Build apps/finance"]
    E -->|Type-checks against exports| F["Success"]
```

**Key points:**

- Turbo reads `turbo.json` for dependency graph
- Each package runs `tsc -b` independently
- No cross-package type checking during build (types come from exports)
- Build order handled by Turbo, not TypeScript

## Development Workflow

### Adding a New Package

1. **Create package structure:**

   ```bash
   mkdir packages/my-package/src
   ```

2. **Create `packages/my-package/package.json`:**

   ```json
   {
     "name": "@hominem/my-package",
     "type": "module",
     "exports": {
       ".": {
         "types": "./build/index.d.ts",
         "development": "./src/index.ts",
         "default": "./build/index.js"
       }
     },
     "scripts": {
       "build": "tsc -b"
     }
   }
   ```

3. **Create `packages/my-package/tsconfig.json`:**

   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "rootDir": "src",
       "outDir": "./build",
       "composite": true
     },
     "include": ["src/**/*"]
   }
   ```

4. **Add to workspace in root `package.json`:**

   ```json
   {
     "workspaces": ["packages/my-package", ...]
   }
   ```

5. **Start developing:**
   ```bash
   cd packages/my-package/src
   # Create index.ts and other files
   ```

Bun automatically resolves `@hominem/my-package` imports!

### Type Checking

**During development (instant):**

```bash
# TypeScript LSP handles type checking automatically
# Open any file to see errors in editor
```

**Before committing:**

```bash
bun run typecheck
```

**During build:**

```bash
bun run build
# Turbo orchestrates builds in dependency order
```

### Hot Module Reloading

When you change a file in a package:

1. TypeScript LSP immediately detects the change
2. Dependent packages' type inference updates instantly
3. No build step required
4. Changes visible immediately in apps running with Vite HMR

**Example:**

```typescript
// Edit packages/utils/src/index.ts
export function myHelper(x: string): number { ... }

// In packages/finance/src/index.ts - types update instantly!
import { myHelper } from '@hominem/utils'
myHelper(42) // ❌ Error: argument must be string - caught immediately!
```

## Troubleshooting

### Types not resolving?

1. **Check package.json exports** are correct:

   ```bash
   cat packages/my-package/package.json | grep -A 5 '"exports"'
   ```

2. **Restart TypeScript server** in your editor:
   - VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
   - Other editors: Restart the editor or LSP client

3. **Verify Bun workspace** is configured in root `package.json`:

   ```bash
   cat package.json | grep -A 5 '"workspaces"'
   ```

4. **Check file exists** at the export path:
   ```bash
   ls packages/my-package/src/index.ts
   ```

### Type errors that only appear in build?

This usually means:

- Package exports point to wrong path
- Missing `declaration: true` in tsconfig
- Type inference issue in the source code

**Fix:**

1. Check package.json exports match actual files
2. Run `bun run build` to see full errors
3. Fix type errors in source code

### "Cannot find module" errors?

1. Check package name is spelled correctly (`@hominem/package-name`)
2. Verify `package.json` has correct `name` field
3. Ensure workspace is in root `package.json`
4. Check the package has an `src/index.ts` file

### Build slow or incremental builds failing?

This shouldn't happen with this setup, but if it does:

1. Clean everything: `find . -name "*.tsbuildinfo" -delete && rm -rf packages/*/build`
2. Rebuild: `bun run build`
3. Check for circular dependencies: `npm list --circular` (if circular deps exist, restructure packages)

## Configuration Reference

### When to Modify Configs

✅ **Do modify per-package `tsconfig.json`:**

- Add package-specific `paths`
- Change `jsx` or target
- Add specific `include`/`exclude`

❌ **Don't modify per-package `tsconfig.json`:**

- Add `references` (handled by Bun)
- Add global `paths` (use base config)
- Change `declaration`, `incremental`, `composite`

✅ **Do modify root `tsconfig.base.json`:**

- Compiler flags that apply to all packages
- Global settings like `strict`, `noUnusedLocals`
- Module resolution settings

❌ **Don't modify `tsconfig.base.json`:**

- Package-specific settings
- Path mappings for workspace packages

## Performance Considerations

### Build Time

With this setup:

- **First build**: ~20-30 seconds (depends on package count)
- **Incremental builds**: ~5-10 seconds (Turbo + TypeScript caching)
- **Type checking only** (`bun run typecheck`): ~10-15 seconds

### Editor Performance

- **Zero impact** - editor uses source files directly
- **Go to Definition** - instant navigation to source
- **Autocomplete** - instant across packages
- **Type checking** - real-time as you type

## Migration Notes

### What Changed from Previous Setup

**Before:** Split between path mappings and project references

```json
// Old: Conflicting strategies
{
  "paths": { "@hominem/db": ["packages/db/src/index.ts"] },
  "references": [{ "path": "../db" }]
}
```

**After:** Single, clean strategy

```json
// New: Workspace resolution only
// No paths in tsconfig, no references
// package.json exports handle it all
```

### Files Removed

- `tsconfig.paths.json` - No longer needed

### Files Modified

- `tsconfig.base.json` - Removed path mappings
- All `packages/*/tsconfig.json` - Removed references
- All `apps/*/tsconfig.json` - Removed references
- All `services/*/tsconfig.json` - Removed references

## Further Reading

- [Monorepo Tools Comparison](https://monorepo.tools/)
- [TypeScript Handbook: Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Turborepo Documentation](https://turborepo.dev/)
- [Bun Module Resolution](https://bun.com/docs/runtime/module-resolution)
- [Modern TypeScript Monorepo Patterns (2025)](https://colinhacks.com/essays/live-types-typescript-monorepo)
