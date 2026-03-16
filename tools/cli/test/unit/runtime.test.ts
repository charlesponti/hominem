import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';

import { runCli } from '../../src/runtime';

class MemoryWritable extends Writable {
  chunks: string[] = [];

  override _write(
    chunk: string | Uint8Array,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
    callback();
  }

  toString() {
    return this.chunks.join('');
  }
}

describe('v2 runtime', () => {
  it('returns usage exit code for unknown command', async () => {
    const result = await runCli(['missing', 'command']);
    expect(result.exitCode).toBe(2);
  });

  it('returns success on global help', async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(0);
  });

  it('uses injected cwd env and stdio instead of global process state', async () => {
    const stdout = new MemoryWritable();
    const stderr = new MemoryWritable();
    const hominemHome = path.join(os.tmpdir(), 'hominem-runtime-test-home');
    const injectedCwd = path.join(os.tmpdir(), 'hominem-runtime-test-cwd');
    fs.mkdirSync(injectedCwd, { recursive: true });

    const result = await runCli(['config', 'init', '--format', 'json'], 'hominem', {
      cwd: injectedCwd,
      env: {
        ...process.env,
        HOME: hominemHome,
        USERPROFILE: hominemHome,
        HOMINEM_HOME: hominemHome,
        HOMINEM_DISABLE_KEYTAR: '1',
      },
      stdio: {
        out: stdout,
        err: stderr,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(stderr.toString()).toBe('');
    expect(stdout.toString()).toContain('"ok": true');
    expect(stdout.toString()).toContain('"command": "config init"');
  });
});
