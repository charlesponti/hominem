import chalk from 'chalk';
import { Command } from 'commander';
import { consola } from 'consola';

import {
  getStoredTokens,
  interactiveLogin,
  logout,
  requireAccessToken,
} from '@/utils/auth';

const DEFAULT_AUTH_BASE = 'http://localhost:3000';

const loginCommand = new Command('login')
  .description('Authenticate the CLI with your Hominem account')
  .option('-b, --base-url <url>', 'Auth base URL (Supabase/WorkOS proxy)', DEFAULT_AUTH_BASE)
  .option('-s, --scope <scope...>', 'Request specific scopes (space separated)')
  .action(async (options) => {
    const baseOptions = {
      authBaseUrl: options.baseUrl,
      provider: 'supabase',
      scopes: options.scope,
    } as const;

    await interactiveLogin(baseOptions);
  });

const statusCommand = new Command('status')
  .description('Show current authentication status')
  .action(async () => {
    const tokens = await getStoredTokens();
    if (!tokens?.accessToken) {
      consola.info(chalk.yellow('Not authenticated. Run `hominem auth login`'));
      return;
    }
    consola.info(chalk.green('Authenticated'));
    if (tokens.expiresAt) {
      consola.info(`Expires at: ${tokens.expiresAt}`);
    }
    if (tokens.scopes?.length) {
      consola.info(`Scopes: ${tokens.scopes.join(' ')}`);
    }
    if (tokens.provider) {
      consola.info(`Provider: ${tokens.provider}`);
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
      await interactiveLogin({ authBaseUrl: DEFAULT_AUTH_BASE, provider: 'supabase' });
    });
  });

export default command;
