import type { z } from 'zod';

import crypto from 'node:crypto';
import { ZodError } from 'zod';

import type {
  CliWriteStream,
  CommandDefinition,
  CommandFailure,
  CommandSuccess,
  JsonValue,
  OutputFormat,
} from './contracts';

import { CliError, toExitCode } from './errors';
import { renderGlobalHelp } from './help';
import { writeFailure, writeSuccess } from './output';
import { parseArgv } from './parser';
import { findRoute } from './registry';

interface RunResult {
  exitCode: number;
}

interface RunCliOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: {
    out: CliWriteStream;
    err: CliWriteStream;
  };
}

function serializeJsonValue(input: object): JsonValue {
  return JSON.parse(JSON.stringify(input)) as JsonValue;
}

function toCamelCase(input: string): string {
  return input.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function normalizeFlagRecord(
  flags: Record<string, string | boolean>,
): Record<string, string | boolean> {
  const normalized: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(flags)) {
    normalized[toCamelCase(key)] = value;
  }
  return normalized;
}

function renderCommandHelp(
  definition: CommandDefinition<z.ZodTypeAny, z.ZodTypeAny, JsonValue>,
  binaryName: string,
): string {
  const lines: string[] = [];
  lines.push(`${definition.name} - ${definition.summary}`);
  lines.push('');
  lines.push(definition.description);
  lines.push('');
  lines.push('USAGE');
  lines.push(`  ${binaryName} ${definition.name} ${definition.argNames.join(' ')} [--flags]`);
  lines.push('');
  lines.push('FLAGS');
  lines.push('  --format <text|json|ndjson>');
  lines.push('  --quiet');
  lines.push('  --verbose');
  lines.push('  --interactive');
  lines.push('  --help');
  return lines.join('\n');
}

async function withScopedProcessState<T>(
  input: { cwd: string; env: NodeJS.ProcessEnv },
  run: () => Promise<T>,
): Promise<T> {
  const previousCwd = process.cwd();
  const previousEnv = { ...process.env };

  process.chdir(input.cwd);

  for (const key of Object.keys(process.env)) {
    if (!(key in input.env)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(input.env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    process.chdir(previousCwd);
    for (const key of Object.keys(process.env)) {
      if (!(key in previousEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

export async function runCli(
  argv: string[],
  binaryName = 'hominem',
  options?: RunCliOptions,
): Promise<RunResult> {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const stdio = options?.stdio ?? {
    out: process.stdout,
    err: process.stderr,
  };
  const parsed = parseArgv(argv);

  if (parsed.commandTokens.length === 0) {
    stdio.out.write(`${renderGlobalHelp(binaryName)}\n`);
    return { exitCode: 0 };
  }

  const matched = (() => {
    for (let consumed = parsed.commandTokens.length; consumed >= 1; consumed -= 1) {
      const result = findRoute(parsed.commandTokens.slice(0, consumed));
      if (result && result.consumed === consumed) {
        return {
          route: result.route,
          extraArgs: parsed.commandTokens.slice(consumed),
        };
      }
    }
    return null;
  })();
  if (!matched) {
    const payload: CommandFailure = {
      ok: false,
      command: parsed.commandTokens.join(' '),
      timestamp: new Date().toISOString(),
      code: 'UNKNOWN_COMMAND',
      category: 'usage',
      message: `Unknown command '${parsed.commandTokens.join(' ')}'`,
    };
    writeFailure(parsed.globals.outputFormat, payload, stdio.err);
    return { exitCode: toExitCode('usage') };
  }

  const remainingPositional = [...matched.extraArgs, ...parsed.args];

  const module = await matched.route.loader();
  const command = module.default;

  if (parsed.globals.help) {
    stdio.out.write(`${renderCommandHelp(command, binaryName)}\n`);
    return { exitCode: 0 };
  }

  const abortController = new AbortController();
  const onSigInt = () => abortController.abort();
  process.once('SIGINT', onSigInt);

  try {
    return await withScopedProcessState({ cwd, env }, async () => {
      const argObject: Record<string, string> = {};
      for (let index = 0; index < command.argNames.length; index += 1) {
        const argName = command.argNames[index];
        const value = remainingPositional[index];
        if (value) {
          argObject[argName] = value;
        }
      }

      const flagsObject = normalizeFlagRecord(parsed.flags);

      const args = command.args.parse(argObject);
      const flags = command.flags.parse(flagsObject);

      const outputFormat = parsed.globals.outputFormat as OutputFormat;
      const context = {
        cwd,
        env,
        stdio: {
          out: stdio.out,
          err: stdio.err,
        },
        outputFormat,
        quiet: parsed.globals.quiet,
        verbose: parsed.globals.verbose,
        interactive: parsed.globals.interactive,
        telemetry: {
          requestId: crypto.randomUUID(),
          startedAt: new Date().toISOString(),
        },
        abortSignal: abortController.signal,
      };

      const result = await command.run({ args, flags, context });
      const output = command.outputSchema.parse(result);

      const payload: CommandSuccess<typeof output> = {
        ok: true,
        command: command.name,
        timestamp: new Date().toISOString(),
        data: output,
        message: command.summary,
      };

      writeSuccess(outputFormat, payload, stdio.out);
      return { exitCode: 0 };
    });
  } catch (error) {
    const outputFormat = parsed.globals.outputFormat;

    if (error instanceof ZodError) {
      const payload: CommandFailure = {
        ok: false,
        command: command.name,
        timestamp: new Date().toISOString(),
        code: 'VALIDATION_ERROR',
        category: 'validation',
        message: 'Command input validation failed',
        details: serializeJsonValue({ issues: error.issues }),
      };
      writeFailure(outputFormat, payload, stdio.err);
      return { exitCode: toExitCode('validation') };
    }

    if (error instanceof CliError) {
      const payload: CommandFailure = {
        ok: false,
        command: command.name,
        timestamp: new Date().toISOString(),
        code: error.code,
        category: error.category,
        message: error.message,
        details: error.details,
        hint: error.hint,
      };
      writeFailure(outputFormat, payload, stdio.err);
      return { exitCode: toExitCode(error.category) };
    }

    const payload: CommandFailure = {
      ok: false,
      command: command.name,
      timestamp: new Date().toISOString(),
      code: 'INTERNAL_ERROR',
      category: 'internal',
      message: error instanceof Error ? error.message : 'Unknown failure',
    };
    writeFailure(outputFormat, payload, stdio.err);
    return { exitCode: toExitCode('internal') };
  } finally {
    process.removeListener('SIGINT', onSigInt);
  }
}
