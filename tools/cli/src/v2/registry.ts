import type { CommandRoute } from './contracts'

export const commandRoutes: CommandRoute[] = [
  {
    id: 'auth',
    summary: 'Authentication domain',
    description: 'Authentication commands: login, status, logout.',
    loader: () => import('./commands/auth/root')
  },
  {
    id: 'auth login',
    summary: 'Authenticate via browser or device flow',
    description: 'Authenticate and persist access tokens for CLI operations.',
    loader: () => import('./commands/auth/login')
  },
  {
    id: 'auth logout',
    summary: 'Clear local auth tokens',
    description: 'Deletes persisted authentication tokens.',
    loader: () => import('./commands/auth/logout')
  },
  {
    id: 'auth status',
    summary: 'Show current authentication status',
    description: 'Prints token metadata and expiry health.',
    loader: () => import('./commands/auth/status')
  },
  {
    id: 'config',
    summary: 'Configuration domain',
    description: 'Config commands: init, get, set.',
    loader: () => import('./commands/config/root')
  },
  {
    id: 'config init',
    summary: 'Initialize config v2',
    description: 'Creates canonical config v2 at ~/.hominem/config.json.',
    loader: () => import('./commands/config/init')
  },
  {
    id: 'config get',
    summary: 'Read config values',
    description: 'Reads full config or a dot-path selector.',
    loader: () => import('./commands/config/get')
  },
  {
    id: 'config set',
    summary: 'Write config values',
    description: 'Writes a value to a dot-path selector in config v2.',
    loader: () => import('./commands/config/set')
  },
  {
    id: 'system',
    summary: 'System domain',
    description: 'System commands: doctor, generate command.',
    loader: () => import('./commands/system/root')
  },
  {
    id: 'system doctor',
    summary: 'Run diagnostics',
    description: 'Checks environment and config preconditions.',
    loader: () => import('./commands/system/doctor')
  },
  {
    id: 'system generate command',
    summary: 'Generate command scaffolding',
    description: 'Scaffolds a v2 typed command module.',
    loader: () => import('./commands/system/generate-command')
  },
  {
    id: 'ai',
    summary: 'AI command domain',
    description: 'Automation-first AI command namespace.',
    loader: () => import('./commands/ai/root')
  },
  {
    id: 'ai models',
    summary: 'List available AI models',
    description: 'Returns provider model inventory from the API.',
    loader: () => import('./commands/ai/models')
  },
  {
    id: 'ai invoke',
    summary: 'Invoke AI message flow',
    description: 'Creates a chat and sends a single prompt message.',
    loader: () => import('./commands/ai/invoke')
  },
  {
    id: 'ai ping',
    summary: 'Check AI API availability',
    description: 'Runs a non-auth health probe for AI API reachability.',
    loader: () => import('./commands/ai/ping')
  },
  {
    id: 'data',
    summary: 'Data command domain',
    description: 'Data import/analysis command namespace.',
    loader: () => import('./commands/data/root')
  },
  {
    id: 'data accounts',
    summary: 'List account data',
    description: 'Fetches finance account data from API.',
    loader: () => import('./commands/data/accounts')
  },
  {
    id: 'data profiles',
    summary: 'List configured data profiles',
    description: 'Reads configured profiles from local config v2.',
    loader: () => import('./commands/data/profiles')
  },
  {
    id: 'files',
    summary: 'Files command domain',
    description: 'File tooling command namespace.',
    loader: () => import('./commands/files/root')
  },
  {
    id: 'files inventory',
    summary: 'Inventory files in a directory',
    description: 'Scans files under a path with deterministic output.',
    loader: () => import('./commands/files/inventory')
  },
  {
    id: 'files head',
    summary: 'Preview top lines from a file',
    description: 'Reads first N lines from a text file.',
    loader: () => import('./commands/files/head')
  },
  {
    id: 'files rename-markdown',
    summary: 'Normalize markdown file names',
    description: 'Renames markdown files into a stable date/type/topic format.',
    loader: () => import('./commands/files/rename-markdown')
  },
  {
    id: 'agent',
    summary: 'Agent command domain',
    description: 'Agent orchestration command namespace.',
    loader: () => import('./commands/agent/root')
  },
  {
    id: 'agent start',
    summary: 'Start local agent server',
    description: 'Starts the local agent in background by default.',
    loader: () => import('./commands/agent/start')
  },
  {
    id: 'agent stop',
    summary: 'Stop local agent server',
    description: 'Stops background agent by PID.',
    loader: () => import('./commands/agent/stop')
  },
  {
    id: 'agent status',
    summary: 'Show local agent status',
    description: 'Reports local background agent process health.',
    loader: () => import('./commands/agent/status')
  },
  {
    id: 'agent health',
    summary: 'Probe local agent health endpoint',
    description: 'Checks local agent HTTP health response.',
    loader: () => import('./commands/agent/health')
  }
]

export function findRoute(tokens: string[]): { route: CommandRoute; consumed: number } | null {
  let best: { route: CommandRoute; consumed: number } | null = null

  for (const route of commandRoutes) {
    const routeTokens = route.id.split(' ')
    if (tokens.length < routeTokens.length) {
      continue
    }

    const matches = routeTokens.every((token, index) => tokens[index] === token)
    if (!matches) {
      continue
    }

    if (!best || routeTokens.length > best.consumed) {
      best = { route, consumed: routeTokens.length }
    }
  }

  return best
}
