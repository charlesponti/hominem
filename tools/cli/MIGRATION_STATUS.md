# oclif Migration Status

## ✅ Completed

### Configuration & Build
- ✅ Updated `package.json` with oclif dependency and config
- ✅ Created `bin/hominem.js` entry point
- ✅ Updated `tsconfig.build.json` for oclif output
- ✅ Created `src/utils/zod-validation.ts` helper

### Migrated Commands (5)
- ✅ `src/commands/auth/login.ts`
- ✅ `src/commands/auth/logout.ts`
- ✅ `src/commands/auth/status.ts`
- ✅ `src/commands/config/init.ts`
- ✅ `src/commands/files/head.ts`

### Documentation
- ✅ Created `OCLIF_MIGRATION_GUIDE.md` with:
  - Full pattern examples
  - Flags migration reference
  - Arguments handling
  - Error handling patterns
  - Testing setup
  - Migration checklist

## ⏳ Remaining

### Commands to Migrate (~30)

**Auth domain:**
- ⏳ `src/commands/auth/root.ts` (delete — auto-generated)

**Config domain:**
- ⏳ `src/commands/config/get.ts`
- ⏳ `src/commands/config/set.ts`
- ⏳ `src/commands/config/root.ts` (delete)

**AI domain:**
- ⏳ `src/commands/ai/invoke.ts`
- ⏳ `src/commands/ai/models.ts`
- ⏳ `src/commands/ai/ping.ts`
- ⏳ `src/commands/ai/root.ts` (delete)

**Agent domain:**
- ⏳ `src/commands/agent/health.ts`
- ⏳ `src/commands/agent/start.ts`
- ⏳ `src/commands/agent/status.ts`
- ⏳ `src/commands/agent/stop.ts`
- ⏳ `src/commands/agent/root.ts` (delete)

**Files domain:**
- ⏳ `src/commands/files/inventory.ts`
- ⏳ `src/commands/files/rename-markdown.ts`
- ⏳ `src/commands/files/root.ts` (delete)

**Other domains:**
- ⏳ `src/commands/system/*.ts` (doctor, generate-command, plugin-call)
- ⏳ `src/commands/data/*.ts` (accounts, profiles)
- ⏳ `src/commands/skills/*.ts` (export, import)

### Files to Delete (After migration complete)
- ⏳ `src/contracts.ts` (replaced by oclif types)
- ⏳ `src/command-factory.ts`
- ⏳ `src/registry.ts`
- ⏳ `src/runtime.ts`
- ⏳ `src/parser.ts`
- ⏳ `src/help.ts`
- ⏳ `src/cli.ts`
- ⏳ All `*root.ts` files in commands

### Other Updates
- ⏳ Remove obsolete `src/errors.ts` patterns (migrate to oclif this.error)
- ⏳ Update build scripts if needed
- ⏳ Update tests to use oclif test utilities
- ⏳ Verify bundle size

## Migration Path

Each command follows this pattern:

```typescript
// 1. Import oclif types
import { Command, Flags, Args } from '@oclif/core';

// 2. Create output schema (if needed)
const outputSchema = z.object({ /* ... */ });

// 3. Extend Command class with:
export default class AuthLogin extends Command {
  static description = '...';
  static override flags = { /* flags descriptors */ };
  static override args = { /* args descriptors */ };
  static enableJsonFlag = true;

  async run(): Promise<OutputType> {
    const { flags, args } = await this.parse(CommandClass);
    // business logic
    return validateWithZod(outputSchema, output);
  }
}
```

See `OCLIF_MIGRATION_GUIDE.md` for detailed patterns and examples.

## Next Steps

1. **Batch migrate remaining commands** using the guide as reference
2. **Delete root.ts files** (one per domain) — oclif auto-generates help
3. **Run build & test**: `bun run build && bun run test`
4. **Verify commands work**: `node dist/hominem auth login --help`
5. **Delete obsolete files** once all commands migrated
6. **Update any docs** that reference the custom framework

## Testing the Migration

```bash
# Install deps
bun install

# Build
bun run build

# Test a migrated command
node dist/hominem auth login --help
node dist/hominem auth status --json

# Run test suite
bun run test
```

## Quick Stats

- **Total commands to migrate: ~30**
- **Migrated: 5**
- **Root commands to delete: 8**
- **Framework files to remove: 8**
- **Estimated effort: ~2-3 hours** for remaining migrations
