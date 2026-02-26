import { describe, expect, it } from 'bun:test';

import { runCli } from '../../../src/v2/runtime';

describe('v2 runtime', () => {
  it('returns usage exit code for unknown command', async () => {
    const result = await runCli(['missing', 'command']);
    expect(result.exitCode).toBe(2);
  });

  it('returns success on global help', async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(0);
  });
});
