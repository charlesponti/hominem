import { commandRoutes } from './registry'

const domains = [
  { id: 'auth', description: 'Authentication commands' },
  { id: 'ai', description: 'AI automation commands' },
  { id: 'data', description: 'Data ingestion commands' },
  { id: 'files', description: 'File conversion and manipulation' },
  { id: 'agent', description: 'Agent orchestration commands' },
  { id: 'system', description: 'System diagnostics and generators' },
  { id: 'config', description: 'Configuration commands' }
]

export function renderGlobalHelp(binaryName: string): string {
  const lines: string[] = []
  lines.push('Hominem CLI v2 (automation-first)')
  lines.push('')
  lines.push('USAGE')
  lines.push(`  ${binaryName} <domain> <command> [args] [--flags]`)
  lines.push('')
  lines.push('GLOBAL FLAGS')
  lines.push('  --format <text|json|ndjson>')
  lines.push('  --quiet')
  lines.push('  --verbose')
  lines.push('  --interactive')
  lines.push('  --help')
  lines.push('')
  lines.push('DOMAINS')
  for (const domain of domains) {
    lines.push(`  ${domain.id.padEnd(8)} ${domain.description}`)
  }
  lines.push('')
  lines.push('COMMANDS')
  for (const route of commandRoutes) {
    lines.push(`  ${route.id.padEnd(24)} ${route.summary}`)
  }

  return lines.join('\n')
}
