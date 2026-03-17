import { describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import {
  SERVICE_CONFIGS,
  compareEnvVars,
  findLocalEnvFile,
  getPrimaryEnvFile,
  getServiceConfig,
  maskSecretValue,
  parseEnvFile,
  writeEnvFile,
} from './env-tooling';

describe('env-tooling', () => {
  it('compares missing, extra, and mismatched variables', () => {
    const localVars = new Map([
      ['DATABASE_URL', 'postgres://local'],
      ['JWT_SECRET', 'local-secret'],
    ]);
    const railwayVars = new Map([
      ['DATABASE_URL', 'postgres://railway'],
      ['EXTRA_FLAG', '1'],
      ['RAILWAY_PROJECT_ID', 'abc'],
    ]);

    expect(compareEnvVars(localVars, railwayVars)).toEqual({
      extra: ['EXTRA_FLAG'],
      missing: ['JWT_SECRET'],
      mismatch: [
        {
          local: 'postgres://local',
          name: 'DATABASE_URL',
          railway: 'postgres://railway',
        },
      ],
      status: 'mismatch',
    });
  });

  it('redacts secret values instead of leaking prefixes', () => {
    expect(maskSecretValue('super-secret-value')).toBe('<redacted>');
    expect(maskSecretValue('')).toBe('<empty>');
  });

  it('parses and writes env files consistently', () => {
    const tempDir = mkdtempSync(`${tmpdir()}/hominem-env-tooling-`);
    const filePath = `${tempDir}/.env`;

    writeEnvFile(
      filePath,
      new Map([
        ['FOO', 'bar'],
        ['MULTI', 'hello world'],
      ]),
    );

    expect(parseEnvFile(filePath)).toEqual(
      new Map([
        ['FOO', 'bar'],
        ['MULTI', 'hello world'],
      ]),
    );
  });

  it('resolves local env files from the shared service config', () => {
    const tempDir = mkdtempSync(`${tmpdir()}/hominem-env-config-`);
    const config = SERVICE_CONFIGS[0];
    const envPath = `${tempDir}/${config.envFiles[1]}`;

    mkdirSync(`${tempDir}/services/api`, { recursive: true });
    writeFileSync(envPath, 'FOO=bar\n');

    expect(findLocalEnvFile(config, tempDir)).toBe(envPath);
    expect(getPrimaryEnvFile(config, tempDir)).toBe(`${tempDir}/${config.envFiles[0]}`);
  });
});
