import chalk from 'chalk';
import { Command } from 'commander';
import { consola } from 'consola';
import type { StoredTokens } from '@/utils/secure-store';

import {
  getStoredTokens,
  interactiveLogin,
  logout,
  requireAccessToken,
} from '@/utils/auth';

const DEFAULT_AUTH_BASE = 'http://localhost:3000';

export function formatAuthStatusLines(tokens: StoredTokens | null, now = Date.now()): string[] {
  if (!tokens?.accessToken) {
    return [chalk.yellow('Not authenticated. Run `hominem auth login`')];
  }

  const lines: string[] = [];
  const expiresAtMs = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : null;
  const isExpired = expiresAtMs !== null ? expiresAtMs <= now : false;
  const stateLabel = isExpired ? chalk.red('expired') : chalk.green('active');

  lines.push(`Authenticated (${stateLabel})`);
  lines.push(`Provider: ${tokens.provider ?? 'better-auth'}`);

  if (tokens.expiresAt) {
    lines.push(`Expires at: ${tokens.expiresAt}`);
    if (expiresAtMs !== null) {
      const secondsRemaining = Math.floor((expiresAtMs - now) / 1000);
      lines.push(`TTL seconds: ${Math.max(0, secondsRemaining)}`);
    }
  }

  if (tokens.scopes?.length) {
    lines.push(`Scopes: ${tokens.scopes.join(' ')}`);
  }
  if (tokens.sessionId) {
    lines.push(`Session ID: ${tokens.sessionId}`);
  }
  if (tokens.refreshFamilyId) {
    lines.push(`Refresh Family ID: ${tokens.refreshFamilyId}`);
  }
  if (tokens.issuedAt) {
    lines.push(`Issued at: ${tokens.issuedAt}`);
  }

  return lines;
}

const loginCommand = new Command('login')
  .description('Authenticate the CLI with your Hominem account')
  .option('-b, --base-url <url>', 'Auth base URL', DEFAULT_AUTH_BASE)
  .option('-s, --scope <scope...>', 'Request specific scopes (space separated)')
  .option('--device', 'Use device-code flow (recommended for headless terminals)', false)
  .action(async (options) => {
    const baseOptions = {
      authBaseUrl: options.baseUrl,
      scopes: options.scope,
      headless: Boolean(options.device),
    } as const;

    await interactiveLogin(baseOptions);
  });

const statusCommand = new Command('status')
  .description('Show current authentication status')
  .action(async () => {
    const tokens = await getStoredTokens();
    for (const line of formatAuthStatusLines(tokens)) {
      consola.info(line);
    }
  });

const logoutCommand = new Command('logout')
  .description('Clear local authentication tokens')
  .action(async () => {
    await logout();
  });

// Legacy shim: `hominem auth` without subcommand performs login
export const command = new Command('auth')
  .description('Authentication utilities')
  .addCommand(loginCommand)
  .addCommand(statusCommand)
  .addCommand(logoutCommand)
  .action(async () => {
    await requireAccessToken().catch(async () => {
      await interactiveLogin({ authBaseUrl: DEFAULT_AUTH_BASE });
    });
  });

export default command;
