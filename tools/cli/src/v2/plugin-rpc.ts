import type { ChildProcessByStdio, SpawnOptionsWithoutStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { z } from 'zod';

import type { JsonValue } from './contracts';

import { CliError } from './errors';
import { JsonValueSchema } from './json-value-schema';
import { loadPluginManifest, resolvePluginEntry } from './plugin';

const JsonRpcRequestSchema = z.object({
  id: z.string(),
  method: z.string().min(1),
  params: JsonValueSchema.optional(),
});

const JsonRpcSuccessSchema = z.object({
  id: z.string(),
  result: JsonValueSchema,
});

const JsonRpcErrorSchema = z.object({
  id: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: JsonValueSchema.optional(),
  }),
});

interface InvokePluginRpcInput {
  pluginRoot: string;
  method: string;
  params?: JsonValue;
  timeoutMs?: number;
  runtimeBinary?: string;
  spawnProcess?: (
    command: string,
    args: string[],
    options: SpawnOptionsWithoutStdio,
  ) => ChildProcessByStdio<Writable, Readable, Readable>;
}

function parseJsonLine(line: string): JsonValue {
  try {
    return JSON.parse(line) as JsonValue;
  } catch {
    throw new CliError({
      code: 'PLUGIN_RPC_INVALID',
      category: 'dependency',
      message: 'Plugin did not return valid JSON-RPC payload',
    });
  }
}

function createTimeoutError(timeoutMs: number): CliError {
  return new CliError({
    code: 'PLUGIN_RPC_TIMEOUT',
    category: 'dependency',
    message: `Plugin request timed out after ${timeoutMs}ms`,
  });
}

export async function invokePluginRpc(input: InvokePluginRpcInput): Promise<JsonValue> {
  const timeoutMs = input.timeoutMs ?? 5000;
  const manifest = await loadPluginManifest(input.pluginRoot);
  const entryPath = resolvePluginEntry(input.pluginRoot, manifest);

  const requestId = crypto.randomUUID();
  const request = JsonRpcRequestSchema.parse({
    id: requestId,
    method: input.method,
    params: input.params,
  });

  const runtimeBinary =
    input.runtimeBinary ?? process.env.HOMINEM_PLUGIN_RUNTIME ?? process.execPath;
  const runtimeArgs = runtimeBinary.includes('bun') ? ['run', entryPath] : [entryPath];
  const spawnProcess = input.spawnProcess ?? spawn;
  const child = spawnProcess(runtimeBinary, runtimeArgs, {
    cwd: input.pluginRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      HOMINEM_PLUGIN_NAME: manifest.name,
    },
  });

  child.stdin.write(`${JSON.stringify(request)}\n`);
  child.stdin.end();

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  child.stdout.on('data', (chunk: Buffer) => {
    stdoutChunks.push(chunk.toString('utf-8'));
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk.toString('utf-8'));
  });
  const stdoutEndPromise = once(child.stdout, 'end');
  const stderrEndPromise = once(child.stderr, 'end');

  const closePromise = once(child, 'close') as Promise<[number | null]>;
  const errorPromise = once(child, 'error') as Promise<[Error]>;

  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    child.kill('SIGTERM');
  }, timeoutMs);

  let exitCode: number | null = null;
  try {
    const outcome = await Promise.race([
      closePromise.then((value) => ({ type: 'close' as const, value })),
      errorPromise.then((value) => ({ type: 'error' as const, value })),
    ]);
    if (outcome.type === 'error') {
      throw new CliError({
        code: 'PLUGIN_RUNTIME_UNAVAILABLE',
        category: 'dependency',
        message: outcome.value[0].message,
      });
    }
    [exitCode] = outcome.value;
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      code: 'PLUGIN_RPC_FAILED',
      category: 'dependency',
      message: 'Plugin process failed before producing output',
    });
  } finally {
    clearTimeout(timer);
  }
  await Promise.all([stdoutEndPromise, stderrEndPromise]);

  const stdout = stdoutChunks.join('');
  const stderr = stderrChunks.join('');

  if (didTimeout) {
    throw createTimeoutError(timeoutMs);
  }

  if (exitCode !== 0) {
    throw new CliError({
      code: 'PLUGIN_RPC_FAILED',
      category: 'dependency',
      message: `Plugin process exited with code ${exitCode}`,
      details: { stderr, stdout, runtimeBinary, runtimeArgs },
    });
  }

  const line = stdout.trim().split('\n')[0];
  if (!line) {
    throw new CliError({
      code: 'PLUGIN_RPC_EMPTY',
      category: 'dependency',
      message: 'Plugin process returned empty output',
    });
  }

  const payload = parseJsonLine(line);
  const success = JsonRpcSuccessSchema.safeParse(payload);
  if (success.success) {
    return success.data.result;
  }

  const failure = JsonRpcErrorSchema.safeParse(payload);
  if (failure.success) {
    throw new CliError({
      code: failure.data.error.code,
      category: 'dependency',
      message: failure.data.error.message,
      details: failure.data.error.details,
    });
  }

  throw new CliError({
    code: 'PLUGIN_RPC_INVALID',
    category: 'dependency',
    message: 'Plugin response did not match JSON-RPC schema',
  });
}
