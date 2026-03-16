import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { createTestCommandContext } from '../../../test/helpers/command-context';

const getStoredTokensMock = mock();
const hasValidStoredSessionMock = mock();
const accessMock = mock();
const loadConfigV2Mock = mock();

mock.module('@/utils/auth', () => ({
  getStoredTokens: getStoredTokensMock,
  hasValidStoredSession: hasValidStoredSessionMock,
}));

mock.module('node:fs/promises', () => ({
  default: {
    access: accessMock,
  },
}));

mock.module('../../config', () => ({
  getConfigPath: () => '/tmp/hominem-config.json',
  loadConfigV2: loadConfigV2Mock,
}));

const commandModule = await import('./doctor');

describe('system doctor command', () => {
  beforeEach(() => {
    getStoredTokensMock.mockReset();
    hasValidStoredSessionMock.mockReset();
    accessMock.mockReset();
    loadConfigV2Mock.mockReset();
    accessMock.mockResolvedValue(undefined);
    loadConfigV2Mock.mockResolvedValue({ version: 2 });
  });

  test('reports remotely validated auth session when stored bearer is accepted', async () => {
    getStoredTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'stored-bearer',
      issuerBaseUrl: 'http://localhost:4040',
      provider: 'better-auth',
    });
    hasValidStoredSessionMock.mockResolvedValueOnce(true);

    const result = await commandModule.default.run({
      args: {},
      flags: {},
      context: createTestCommandContext(),
    });

    expect(result.checks).toContainEqual({
      id: 'auth.token',
      status: 'pass',
      message: 'auth device-session token stored',
    });
    expect(result.checks).toContainEqual({
      id: 'auth.session',
      status: 'pass',
      message: 'auth session validated remotely',
    });
  });

  test('warns when stored bearer is no longer accepted remotely', async () => {
    getStoredTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'stored-bearer',
      issuerBaseUrl: 'http://localhost:4040',
      provider: 'better-auth',
    });
    hasValidStoredSessionMock.mockResolvedValueOnce(false);

    const result = await commandModule.default.run({
      args: {},
      flags: {},
      context: createTestCommandContext(),
    });

    expect(result.checks).toContainEqual({
      id: 'auth.session',
      status: 'warn',
      message: "stored auth token is not accepted; run 'hominem auth login'",
    });
  });

  test('does not emit auth.session when no issuer base URL is stored', async () => {
    getStoredTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'stored-bearer',
      provider: 'better-auth',
    });

    const result = await commandModule.default.run({
      args: {},
      flags: {},
      context: createTestCommandContext(),
    });

    expect(result.checks).toContainEqual({
      id: 'auth.token',
      status: 'pass',
      message: 'auth device-session token stored',
    });
    expect(result.checks.some((check) => check.id === 'auth.session')).toBe(false);
    expect(hasValidStoredSessionMock).not.toHaveBeenCalled();
  });
});
