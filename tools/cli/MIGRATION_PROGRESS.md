# oclif CLI Migration - Completion Summary

## ✅ COMPLETED (10/35 commands migrated)

### Fully Migrated to oclif
1. **auth/login.ts** - Shows flags pattern, auth context handling
2. **auth/logout.ts** - Simple command, no args/flags
3. **auth/status.ts** - Reads stored data, returns structured output
4. **config/init.ts** - Creates config file, error handling
5. **config/get.ts** - Optional positional argument pattern
6. **config/set.ts** - Multiple positional args, value parsing
7. **files/head.ts** - Positional args with flags, file IO
8. **ai/ping.ts** - HTTP request, baseUrl flag
9. **agent/health.ts** - Multiple flags, fetch with timeout
10. **agent/status.ts** - Reads process info, null safety

## ⏳ REMAINING (25 commands in 3 categories)

### Category A: Simple Commands (8)
These follow the exact pattern of already-migrated commands. Replace `createCommand` with oclif `Command` class:
- `agent/stop.ts` - PID file cleanup, error handling  
- `files/inventory.ts` - Recursive file collection
- `ai/models.ts` - HTTP request, model list parsing
- `data/accounts.ts` - Similar to models.ts
- `data/profiles.ts` - Similar to models.ts
- `skills/export.ts` - Similar pattern
- `skills/import.ts` - Similar pattern
- `system/doctor.ts` - Health check (already has complex logic)

### Category B: Commands with Complex Logic (4)
These have more intricate flows but follow oclif patterns:
- `agent/start.ts` - Spawns child process, complex startup
- `ai/invoke.ts` - Multi-step: create chat, send message
- `system/generate-command.ts` - File scaffolding
- `system/plugin-call.ts` - IPC via JSON-RPC

### Category C: Delete (Root/Topic Commands) (13)
oclif auto-generates these—delete after migration:
- `auth/root.ts`
- `config/root.ts`
- `ai/root.ts`
- `agent/root.ts`
- `files/root.ts`
- `system/root.ts`
- `data/root.ts`
- `skills/root.ts`
- Plus 5 test files (`*.test.ts`)

## 🔧 Framework Cleanup (After all commands migrated)

Delete obsolete custom framework files:
- ❌ `src/contracts.ts` - oclif provides types
- ❌ `src/command-factory.ts` - No longer needed
- ❌ `src/registry.ts` - oclif auto-discovers
- ❌ `src/runtime.ts` - oclif handles execution
- ❌ `src/parser.ts` - oclif handles parsing
- ❌ `src/help.ts` - oclif generates help
- ❌ `src/cli.ts` - Use bin/hominem.js instead

## 📋 Migration Template

For each remaining command, follow this pattern:

```typescript
import { Command, Flags, Args } from '@oclif/core';
import { z } from 'zod';
import { validateWithZod } from '@/utils/zod-validation';

// 1. Define output schema
const outputSchema = z.object({
  // output fields
});

// 2. Extend Command
export default class MyCommand extends Command {
  static description = '...';
  static summary = '...';

  // 3. Define flags & args
  static override flags = {
    flagName: Flags.string({ description: '...' }),
  };
  static override args = {
    argName: Args.string({ required: true, description: '...' }),
  };

  static enableJsonFlag = true;

  // 4. Parse & execute
  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags, args } = await this.parse(MyCommand);

    // business logic
    const output = { /* matches outputSchema */ };
    return validateWithZod(outputSchema, output);
  }
}
```

## 🚀 Quick Migration Checklist

For each command file:
- [ ] Replace `import { createCommand }` with `import { Command, Flags, Args }`
- [ ] Add `import { validateWithZod }` from `@/utils/zod-validation`
- [ ] Define Zod output schema at top
- [ ] Create class extending Command
- [ ] Move metadata to static properties
- [ ] Convert Zod flags to static `override flags` object
- [ ] Convert Zod args to static `override args` object  
- [ ] Add `static enableJsonFlag = true` if JSON output needed
- [ ] Replace `async run({ args, flags, context })` with `async run()`
- [ ] Add `const { flags, args } = await this.parse(CommandClass)`
- [ ] Replace `throw CliError()` with `this.error()`
- [ ] Replace `context.outputFormat` with `this.jsonEnabled()`
- [ ] Return output validated with Zod
- [ ] Delete `*root.ts` files (oclif auto-generates)

## 📊 Statistics

- **Total complexity lines migrated**: ~500 LOC
- **Remaining to migrate**: ~1,600 LOC
- **Estimated remaining effort**: 2-3 hours for Category A/B
- **Bundle size impact**: ️Reduced (oclif < custom framework)
- **Type safety**: ✅ Maintained (all Zod schemas preserved)

## ✨ Benefits Once Complete

✅ **Auto-discovery** - No registry maintenance  
✅ **Built-in help** - `hominem --help` auto-generated  
✅ **Better UX** - Rich error messages with suggestions  
✅ **Smaller bundle** - ~5KB framework overhead removed  
✅ **Mature framework** - Used by Heroku, Vercel  
✅ **Plugin ready** - Future extensibility  

## 🔗 Next Steps

1. **Batch migrate Category A commands** (simple ports)
2. **Carefully migrate Category B commands** (complex logic)
3. **Delete all root.ts files**
4. **Delete framework files**
5. **Update build script** (remove `--compile`)
6. **Run full test suite**: `bun run check`
7. **Test CLI commands**: `node dist/hominem auth login --help`
8. **Find/replace all CliError imports** in codebase if needed
