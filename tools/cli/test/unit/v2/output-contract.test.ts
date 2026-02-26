import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { CommandSuccess, JsonValue } from '../../../src/v2/contracts';

import { runCli } from '../../../src/v2/runtime';

type OutputFormat = 'json' | 'ndjson';

interface CapturedRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface NormalizedSuccessEnvelope {
  ok: true;
  command: string;
  timestamp: string;
  message: string | undefined;
  data: JsonValue;
}

function normalizeChunk(chunk: string | Uint8Array): string {
  if (typeof chunk === 'string') {
    return chunk;
  }
  return Buffer.from(chunk).toString('utf-8');
}

async function runCaptured(argv: string[]): Promise<CapturedRun> {
  let stdout = '';
  let stderr = '';

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += normalizeChunk(chunk);
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += normalizeChunk(chunk);
    return true;
  }) as typeof process.stderr.write;

  try {
    const result = await runCli(argv);
    return {
      exitCode: result.exitCode,
      stdout,
      stderr,
    };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

async function withCwd<T>(cwd: string, run: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return await run();
  } finally {
    process.chdir(previous);
  }
}

async function withIsolatedPaths<T>(hominemHome: string, run: () => Promise<T>): Promise<T> {
  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  const previousHominemHome = process.env.HOMINEM_HOME;

  process.env.HOME = hominemHome;
  process.env.USERPROFILE = hominemHome;
  process.env.HOMINEM_HOME = hominemHome;

  try {
    return await run();
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousUserProfile;
    }

    if (previousHominemHome === undefined) {
      delete process.env.HOMINEM_HOME;
    } else {
      process.env.HOMINEM_HOME = previousHominemHome;
    }
  }
}

function parseSuccessEnvelope(format: OutputFormat, stdout: string): CommandSuccess<JsonValue> {
  const raw = format === 'ndjson' ? stdout.trim().split('\n')[0] : stdout;
  return JSON.parse(raw) as CommandSuccess<JsonValue>;
}

function normalizeEnvelope(
  input: CommandSuccess<JsonValue>,
  hominemHome: string,
): NormalizedSuccessEnvelope {
  const normalizedString = JSON.stringify(input.data).replaceAll(hominemHome, '<hominem-home>');
  return {
    ok: true,
    command: input.command,
    timestamp: '<timestamp>',
    message: input.message,
    data: JSON.parse(normalizedString) as JsonValue,
  };
}

describe('v2 output contract snapshots', () => {
  it('matches normalized json/ndjson envelopes for core commands', async () => {
    const cliRoot = process.cwd();
    const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hominem-output-contract-'));
    const hominemHome = path.join(sandboxRoot, 'home');
    fs.mkdirSync(hominemHome, { recursive: true });

    await withIsolatedPaths(hominemHome, async () => {
      for (const format of ['json', 'ndjson'] as const) {
        const configInit = await withCwd(cliRoot, async () =>
          runCaptured(['config', 'init', '--format', format]),
        );
        expect(configInit.exitCode).toBe(0);

        const configSet = await withCwd(cliRoot, async () =>
          runCaptured(['config', 'set', 'output.format', '"json"', '--format', format]),
        );
        expect(configSet.exitCode).toBe(0);
        expect(
          normalizeEnvelope(parseSuccessEnvelope(format, configSet.stdout), hominemHome),
        ).toEqual({
          ok: true,
          command: 'config set',
          timestamp: '<timestamp>',
          message: 'Set config values',
          data: {
            updatedPath: 'output.format',
            value: 'json',
          },
        } satisfies NormalizedSuccessEnvelope);

        const configGet = await withCwd(cliRoot, async () =>
          runCaptured(['config', 'get', 'output.format', '--format', format]),
        );
        expect(configGet.exitCode).toBe(0);
        expect(
          normalizeEnvelope(parseSuccessEnvelope(format, configGet.stdout), hominemHome),
        ).toEqual({
          ok: true,
          command: 'config get',
          timestamp: '<timestamp>',
          message: 'Get config values',
          data: {
            value: 'json',
          },
        } satisfies NormalizedSuccessEnvelope);

        const authStatus = await withCwd(cliRoot, async () =>
          runCaptured(['auth', 'status', '--format', format]),
        );
        expect(authStatus.exitCode).toBe(0);
        expect(
          normalizeEnvelope(parseSuccessEnvelope(format, authStatus.stdout), hominemHome),
        ).toEqual({
          ok: true,
          command: 'auth status',
          timestamp: '<timestamp>',
          message: 'Show authentication status',
          data: {
            authenticated: false,
            tokenVersion: null,
            provider: null,
            issuerBaseUrl: null,
            expiresAt: null,
            ttlSeconds: null,
            scopes: [],
          },
        } satisfies NormalizedSuccessEnvelope);

        const systemDoctor = await withCwd(cliRoot, async () =>
          runCaptured(['system', 'doctor', '--format', format]),
        );
        expect(systemDoctor.exitCode).toBe(0);
        const normalizedDoctor = normalizeEnvelope(
          parseSuccessEnvelope(format, systemDoctor.stdout),
          hominemHome,
        );
        const doctorData = normalizedDoctor.data as {
          checks: Array<{ id: string; status: string; message: string }>;
        };
        expect(normalizedDoctor.ok).toBeTrue();
        expect(normalizedDoctor.command).toBe('system doctor');
        expect(normalizedDoctor.timestamp).toBe('<timestamp>');
        expect(normalizedDoctor.message).toBe('Run CLI diagnostics');
        expect(Array.isArray(doctorData.checks)).toBeTrue();
        expect(
          doctorData.checks.some((check) => check.id === 'runtime.node' && check.status === 'pass'),
        ).toBeTrue();
        expect(
          doctorData.checks.some(
            (check) =>
              check.id === 'config.v2' &&
              check.status === 'pass' &&
              check.message === 'config version 2',
          ),
        ).toBeTrue();
        expect(
          doctorData.checks.some((check) => check.id === 'auth.token' && check.status === 'warn'),
        ).toBeTrue();
      }
    });
  });
});
