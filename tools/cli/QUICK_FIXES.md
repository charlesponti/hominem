# Quick Fixes for Remaining Errors

The registry.ts errors are expected—oclif handles command discovery automatically. To clean this up:

## Option 1: Minimal Registry (Keep for reference)

Replace content of `src/registry.ts`:

```typescript
// NOTE: Registry deprecated - oclif auto-discovers commands from src/commands/
// This file preserved as reference for the old framework. Delete after full migration.

import type { CommandRoute } from './contracts';

// All commands are now auto-discovered by oclif from the src/commands/ directory
export const commandRoutes: CommandRoute[] = [];
```

## Option 2: Update Registry Stub

Keep the skeleton for future reference:

```typescript
// DEPRECATED - See OCLIF_MIGRATION_COMPLETE.md for migration details
import type { CommandRoute } from './contracts';

/**
 * @deprecated
 * oclif auto-discovers commands from src/commands/ directory structure.
 * Each subdirectory becomes a command group:
 *   auth/login.ts → hominem auth login
 *   config/get.ts → hominem config get
 *   etc.
 *
 * This registry is maintained as reference for the old framework.
 */
export const commandRoutes: CommandRoute[] = [];
```

## Compilation Status

Once registry fixed, TypeCheck should pass:
- ✅ 10 migrated commands compile
- ✅ Zod validation helper working  
- ✅ oclif imports valid
- ⚠️ Old framework still present but unused

## To Proceed

### Short Term (Get building)
1. Replace src/registry.ts with stub
2. Run `bun run typecheck`
3. Verify no errors

### Long Term (Complete migration)
See `OCLIF_MIGRATION_COMPLETE.md` for full roadmap

---

**Test command verification**:
```bash
cd /Users/charlesponti/Developer/hominem
bun run build --filter @hominem/cli
node tools/cli/dist/hominem auth status --help
node tools/cli/dist/hominem auth status --json
```

This will show the CLI is working with oclif commands!
