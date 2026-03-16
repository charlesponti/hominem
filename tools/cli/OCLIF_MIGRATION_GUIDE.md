# CLI Migration Guide: Custom Framework → oclif

## Overview

The CLI is being migrated from a custom command framework to **oclif**, a mature and production-grade CLI framework. This guide explains the pattern for migrating remaining commands.

## Migration Pattern

### Before (Custom Framework)

```typescript
import { z } from 'zod';
import { createCommand } from '../../command-factory';

export default createCommand({
  name: 'auth login',
  summary: 'Authenticate the CLI',
  description: 'Starts the CLI device-code authentication flow...',
  argNames: [],
  args: z.object({}),
  flags: z.object({
    baseUrl: z.string().default('http://localhost:4040'),
    device: z.boolean().default(false),
  }),
  outputSchema: z.object({
    authenticated: z.literal(true),
  }),
  async run({ flags, context }) {
    // business logic
    return { authenticated: true };
  },
});
```

### After (oclif)

```typescript
import { Command, Flags, Args } from '@oclif/core';
import { z } from 'zod';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  authenticated: z.literal(true),
});

export default class AuthLogin extends Command {
  static description = 'Starts the CLI device-code authentication flow...';
  static summary = 'Authenticate the CLI';

  static override flags = {
    baseUrl: Flags.string({
      description: 'Authentication base URL',
      default: 'http://localhost:4040',
    }),
    device: Flags.boolean({
      description: 'Use device code flow',
      default: false,
    }),
  };

  static override args = {};

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(AuthLogin);

    // business logic
    const output = { authenticated: true };
    return validateWithZod(outputSchema, output);
  }
}
```

## Key Differences

| Aspect | Custom | oclif |
|--------|--------|-------|
| **Base** | Factory function | Extends `Command` class |
| **Flags** | Zod schema | Static `Flags` object with descriptors |
| **Arguments** | Zod schema | Static `Args` object |
| **Parsing** | Automatic | Call `this.parse(CommandClass)` |
| **Output validation** | Zod schema | Use `validateWithZod` helper |
| **Error handling** | `throw CliError` | `this.error()` method |
| **JSON output** | `context.outputFormat` | `this.jsonEnabled()` |
| **Command routing** | Registry + loaders | Auto-discovered from `src/commands/` directory |

## Flags Migration Reference

### Zod → oclif Flags

```typescript
// Zod
z.object({
  verbose: z.boolean().default(false),
  baseUrl: z.string().default('http://localhost:4040'),
  timeout: z.coerce.number().int().positive().default(120000),
  scope: z.string().default(''),
})

// oclif
static override flags = {
  verbose: Flags.boolean({
    description: 'Enable verbose output',
    default: false,
  }),
  baseUrl: Flags.string({
    char: 'u', // short flag: -u
    description: 'Base URL',
    default: 'http://localhost:4040',
  }),
  timeout: Flags.integer({
    description: 'Timeout in milliseconds',
    default: 120000,
  }),
  scope: Flags.string({
    multiple: true, // supports -s val1 -s val2
    delimiter: ',',
    description: 'Scopes (comma-separated)',
    default: '',
  }),
}
```

### Arguments (Positional)

For commands that take positional arguments:

```typescript
// Custom (not really supported well)
args: z.object({
  filename: z.string(),
  count: z.number().optional(),
})

// oclif
static override args = {
  filename: Args.string({
    name: 'filename',
    required: true,
    description: 'File to process',
  }),
  count: Args.integer({
    name: 'count',
    required: false,
    description: 'Item count',
  }),
}
```

## Error Handling Pattern

### Before

```typescript
throw new CliError({
  code: 'AUTH_LOGIN_FAILED',
  category: 'auth',
  message: error instanceof Error ? error.message : 'Unknown error',
  hint: 'Try running with --help',
});
```

### After

```typescript
this.error('Authentication failed: expected reason', {
  exit: 2,          // exit code
  code: 'AUTH_LOGIN_FAILED',
  suggestions: [
    'Try running with --help',
    'Check your connection',
  ],
});
```

## Context Access Changes

| Old | New |
|-----|-----|
| `context.outputFormat === 'text'` | `!this.jsonEnabled()` |
| `context.outputFormat === 'json'` | `this.jsonEnabled()` |
| `context.verbose` | `this.config.root` (access config) |
| `context.interactive` | Check stdin/stdout directly if needed |

## File Structure

oclif auto-discovers commands from directory structure:

```
src/commands/
├── auth/
│   ├── login.ts      → hominem auth login
│   ├── logout.ts     → hominem auth logout
│   └── status.ts     → hominem auth status
├── config/
│   ├── init.ts       → hominem config init
│   ├── get.ts        → hominem config get
│   └── set.ts        → hominem config set
└── system/
    ├── doctor.ts     → hominem system doctor
    └── plugin-call.ts → hominem system plugin-call
```

Root commands (e.g., `hominem auth`) are automatically generated by oclif — no need for explicit root handlers.

## Removed Files

Once all commands are migrated, these files can be deleted:
- `src/contracts.ts` (oclif provides types)
- `src/command-factory.ts` (no longer needed)
- `src/registry.ts` (oclif auto-discovery)
- `src/runtime.ts` (oclif handles execution)
- `src/parser.ts` (oclif handles parsing)
- `src/help.ts` (oclif handles help)
- `src/cli.ts` (use bin/hominem.js instead)
- `src/**/*root.ts` (auto-generated by oclif)

## Testing Pattern

oclif provides test utilities:

```typescript
import { runCommand } from '@oclif/test';
import AuthLogin from '../commands/auth/login';

describe('auth login', () => {
  it('authenticates user', async () => {
    const { stdout } = await runCommand(['auth', 'login']);
    expect(stdout).toContain('authenticated');
  });
});
```

## Migration Checklist

For each command file:

- [ ] Replace `import { createCommand }` with `import { Command, Flags, Args }`
- [ ] Create Zod output schema if output validation needed
- [ ] Convert Zod flags to `static override flags = { ... }`
- [ ] Convert Zod args to `static override args = { ... }`
- [ ] Replace `run({ flags, context })` with `async run()`
- [ ] Call `const { flags } = await this.parse(CommandClass)`
- [ ] Replace `context.outputFormat` checks with `this.jsonEnabled()`
- [ ] Replace `throw CliError` with `this.error()`
- [ ] Return validated output using `validateWithZod()`
- [ ] Add `static enableJsonFlag = true` if JSON output needed
- [ ] Delete `*root.ts` files (topics auto-generated)
- [ ] Test command works: `bun run build && node dist/hominem auth login`

## Example: File with Arguments

```typescript
import { Command, Args, Flags } from '@oclif/core';
import { z } from 'zod';
import { validateWithZod } from '@/utils/zod-validation';

const outputSchema = z.object({
  renamed: z.boolean(),
  oldPath: z.string(),
  newPath: z.string(),
});

export default class RenameCommand extends Command {
  static description = 'Rename a file';

  static override args = {
    oldPath: Args.string({
      name: 'oldPath',
      required: true,
      description: 'Current file path',
    }),
    newPath: Args.string({
      name: 'newPath',
      required: true,
      description: 'New file path',
    }),
  };

  static override flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Overwrite if exists',
      default: false,
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { args, flags } = await this.parse(RenameCommand);

    // business logic
    const output = {
      renamed: true,
      oldPath: args.oldPath,
      newPath: args.newPath,
    };

    return validateWithZod(outputSchema, output);
  }
}
```

## Benefits of oclif

✅ **Mature & battle-tested** — Used by Heroku, Vercel, and others  
✅ **Auto-discovery** — No registry maintenance  
✅ **Built-in help** — Generates help screens automatically  
✅ **Better errors** — Rich error messages with suggestions  
✅ **Hooks & plugins** — Extensible architecture  
✅ **Type-safe** — Full TypeScript support  
✅ **Smaller bundle** — No custom framework overhead  
