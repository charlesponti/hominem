#!/usr/bin/env bun
/**
 * Environment Variable Synchronization Script
 *
 * Syncs environment variables between local .env.production files and Railway services.
 * Supports checking, diagnosing, and fixing mismatches.
 *
 * Usage:
 *   bun scripts/sync-env.ts check [service]          - Check for mismatches
 *   bun scripts/sync-env.ts diagnose [service]       - Diagnose issues with details
 *   bun scripts/sync-env.ts sync <service> <env>     - Sync .env.production to Railway
 *   bun scripts/sync-env.ts set <service> <var>=<val> - Set a single variable
 *   bun scripts/sync-env.ts list [service]           - List all variables in a service
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Types
interface EnvVar {
  name: string
  value?: string
}

interface ServiceConfig {
  name: string
  envFiles: string[]
  railwayService: string
}

interface SyncResult {
  service: string
  localVars: Map<string, string>
  railwayVars: Map<string, string>
  missing: string[]
  extra: string[]
  mismatch: Array<{ name: string; local?: string; railway?: string }>
  status: 'ok' | 'missing' | 'extra' | 'mismatch'
}

// Configuration
const SERVICES: ServiceConfig[] = [
  {
    name: 'api',
    envFiles: ['services/api/.env.production', 'services/api/.env'],
    railwayService: 'hominem-api',
  },
  {
    name: 'workers',
    envFiles: ['services/workers/.env.production', 'services/workers/.env'],
    railwayService: 'workers',
  },
  {
    name: 'db',
    envFiles: ['packages/db/.env.production', 'packages/db/.env'],
    railwayService: 'hominem-db',
  },
  {
    name: 'florin',
    envFiles: ['apps/rocco/.env.production', 'apps/rocco/.env'],
    railwayService: 'Florin',
  },
  {
    name: 'rocco',
    envFiles: ['apps/rocco/.env.production', 'apps/rocco/.env'],
    railwayService: 'Rocco',
  },
  {
    name: 'notes',
    envFiles: ['apps/notes/.env.production', 'apps/notes/.env'],
    railwayService: 'Notes',
  },
]

// Utility functions
function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const colors = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m',
    reset: '\x1b[0m',
  }
  const prefix = {
    info: 'ℹ ',
    warn: '⚠ ',
    error: '✗ ',
    success: '✓ ',
  }
  console.log(`${colors[level]}${prefix[level]}${message}${colors.reset}`)
}

function runCommand(cmd: string, silent = false): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' }).trim()
  } catch (error) {
    if (!silent) {
      log(`Command failed: ${cmd}`, 'error')
    }
    return ''
  }
}

function parseEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>()

  if (!fs.existsSync(filePath)) {
    return vars
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) {
      const [, name, value] = match
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '')
      vars.set(name, cleanValue)
    }
  }

  return vars
}

function getRailwayVars(service: string): Map<string, string> {
  const vars = new Map<string, string>()

  try {
    const output = runCommand(
      `railway variable list --service "${service}" --kv 2>/dev/null || railway variable list --service "${service.replace('hominem-', '')}" --kv 2>/dev/null || true`,
      true,
    )

    if (!output) {
      return vars
    }

    const lines = output.split('\n')
    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (match) {
        const [, name, value] = match
        vars.set(name, value)
      }
    }
  } catch (error) {
    log(`Failed to query Railway for service ${service}`, 'warn')
  }

  return vars
}

function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.name === serviceName)
}

function findLocalEnvFile(config: ServiceConfig): string | null {
  for (const file of config.envFiles) {
    const fullPath = path.join(process.cwd(), file)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }
  return null
}

function compareVars(local: Map<string, string>, railway: Map<string, string>): SyncResult {
  const missing: string[] = []
  const extra: string[] = []
  const mismatch: Array<{ name: string; local?: string; railway?: string }> = []

  // Check for missing variables
  for (const [name] of local) {
    if (!railway.has(name)) {
      missing.push(name)
    }
  }

  // Check for extra variables (exclude Railway-specific ones)
  const railwaySystemVars = new Set([
    'RAILWAY_PROJECT_ID',
    'RAILWAY_PROJECT_NAME',
    'RAILWAY_SERVICE_ID',
    'RAILWAY_SERVICE_NAME',
    'RAILWAY_STATIC_URL',
    'RAILWAY_PUBLIC_DOMAIN',
    'RAILWAY_PRIVATE_DOMAIN',
    'NIXPACKS_NODE_VERSION',
    'COOKIE_DOMAIN',
    'COOKIE_NAME',
    'COOKIE_SALT',
    'COOKIE_SECRET',
    'FLORIN_URL',
    'ROCCO_URL',
    'NOTES_URL',
  ])

  for (const [name] of railway) {
    if (!local.has(name) && !railwaySystemVars.has(name) && !name.startsWith('RAILWAY_SERVICE_')) {
      extra.push(name)
    }
  }

  let status: 'ok' | 'missing' | 'extra' | 'mismatch' = 'ok'
  if (missing.length > 0) status = 'missing'
  if (extra.length > 0) status = 'extra'

  return {
    service: '',
    localVars: local,
    railwayVars: railway,
    missing,
    extra,
    mismatch,
    status,
  }
}

// Commands
async function checkCommand(serviceName?: string) {
  log('Checking environment variable synchronization...', 'info')

  const services = serviceName
    ? SERVICES.filter((s) => s.name === serviceName)
    : SERVICES

  if (serviceName && services.length === 0) {
    log(`Service not found: ${serviceName}`, 'error')
    process.exit(1)
  }

  let allOk = true

  for (const service of services) {
    const envFilePath = findLocalEnvFile(service)
    if (!envFilePath) {
      log(`No .env file found for ${service.name}`, 'warn')
      continue
    }

    const localVars = parseEnvFile(envFilePath)
    const railwayVars = getRailwayVars(service.railwayService)

    const result = compareVars(localVars, railwayVars)

    if (result.missing.length === 0 && result.extra.length === 0) {
      log(`${service.name}: All variables synchronized`, 'success')
    } else {
      allOk = false
      if (result.missing.length > 0) {
        log(`${service.name}: Missing ${result.missing.length} variables in Railway`, 'error')
      }
      if (result.extra.length > 0) {
        log(`${service.name}: ${result.extra.length} extra variables in Railway`, 'warn')
      }
    }
  }

  process.exit(allOk ? 0 : 1)
}

async function diagnoseCommand(serviceName?: string) {
  log('Diagnosing environment variable mismatches...', 'info')
  console.log('')

  const services = serviceName
    ? SERVICES.filter((s) => s.name === serviceName)
    : SERVICES

  if (serviceName && services.length === 0) {
    log(`Service not found: ${serviceName}`, 'error')
    process.exit(1)
  }

  for (const service of services) {
    const envFilePath = findLocalEnvFile(service)
    if (!envFilePath) {
      log(`No .env file found for ${service.name}`, 'warn')
      continue
    }

    log(`\n=== ${service.name} (Railway: ${service.railwayService}) ===`, 'info')

    const localVars = parseEnvFile(envFilePath)
    const railwayVars = getRailwayVars(service.railwayService)
    const result = compareVars(localVars, railwayVars)

    log(`Local variables: ${localVars.size}`, 'info')
    log(`Railway variables: ${railwayVars.size}`, 'info')

    if (result.missing.length > 0) {
      log(`\nMissing from Railway (${result.missing.length}):`, 'error')
      for (const varName of result.missing) {
        const value = localVars.get(varName) || '(empty)'
        console.log(`  - ${varName}`)
      }
    }

    if (result.extra.length > 0) {
      log(`\nExtra in Railway (${result.extra.length}):`, 'warn')
      for (const varName of result.extra.slice(0, 10)) {
        console.log(`  - ${varName}`)
      }
      if (result.extra.length > 10) {
        console.log(`  ... and ${result.extra.length - 10} more`)
      }
    }

    if (result.missing.length === 0 && result.extra.length === 0) {
      log('✓ All variables synchronized', 'success')
    }
  }

  console.log('')
}

async function syncCommand(serviceName: string, envFile: string) {
  const service = getServiceConfig(serviceName)
  if (!service) {
    log(`Service not found: ${serviceName}`, 'error')
    process.exit(1)
  }

  const filePath = path.join(process.cwd(), envFile)
  if (!fs.existsSync(filePath)) {
    log(`File not found: ${envFile}`, 'error')
    process.exit(1)
  }

  log(`Syncing ${envFile} to Railway (${service.railwayService})...`, 'info')

  const localVars = parseEnvFile(filePath)
  let synced = 0
  let failed = 0

  for (const [name, value] of localVars) {
    try {
      const escapedValue = value.replace(/"/g, '\\"')
      runCommand(
        `railway variable set "${name}=${escapedValue}" --service "${service.railwayService}" --skip-deploys`,
        true,
      )
      log(`  ${name}`, 'success')
      synced++
    } catch (error) {
      log(`  ${name} (FAILED)`, 'error')
      failed++
    }
  }

  console.log('')
  log(`Sync complete: ${synced} variables updated`, 'success')
  if (failed > 0) {
    log(`${failed} variables failed to sync`, 'error')
  }

  process.exit(failed > 0 ? 1 : 0)
}

async function setCommand(serviceName: string, varAssignment: string) {
  const service = getServiceConfig(serviceName)
  if (!service) {
    log(`Service not found: ${serviceName}`, 'error')
    process.exit(1)
  }

  const [name, ...valueParts] = varAssignment.split('=')
  const value = valueParts.join('=')

  if (!name || !value) {
    log('Invalid format. Use: bun scripts/sync-env.ts set <service> <VAR>=<value>', 'error')
    process.exit(1)
  }

  log(`Setting ${name} in Railway (${service.railwayService})...`, 'info')

  try {
    const escapedValue = value.replace(/"/g, '\\"')
    runCommand(
      `railway variable set "${name}=${escapedValue}" --service "${service.railwayService}" --skip-deploys`,
      true,
    )
    log(`Successfully set ${name}`, 'success')
  } catch (error) {
    log(`Failed to set ${name}`, 'error')
    process.exit(1)
  }
}

async function listCommand(serviceName?: string) {
  const services = serviceName
    ? SERVICES.filter((s) => s.name === serviceName)
    : SERVICES

  if (serviceName && services.length === 0) {
    log(`Service not found: ${serviceName}`, 'error')
    process.exit(1)
  }

  for (const service of services) {
    log(`\n=== ${service.name} ===`, 'info')

    const envFilePath = findLocalEnvFile(service)
    if (envFilePath) {
      log('\nLocal variables:', 'info')
      const localVars = parseEnvFile(envFilePath)
      for (const [name] of localVars) {
        console.log(`  ${name}`)
      }
    } else {
      log('No local .env file found', 'warn')
    }

    log('\nRailway variables:', 'info')
    const railwayVars = getRailwayVars(service.railwayService)
    if (railwayVars.size === 0) {
      log('No variables found', 'warn')
    } else {
      for (const [name] of railwayVars) {
        console.log(`  ${name}`)
      }
    }
  }

  console.log('')
}

// Main
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Environment Variable Synchronization Tool

Usage:
  bun scripts/sync-env.ts check [service]          - Check for mismatches
  bun scripts/sync-env.ts diagnose [service]       - Diagnose issues with details
  bun scripts/sync-env.ts sync <service> <file>    - Sync .env file to Railway
  bun scripts/sync-env.ts set <service> <VAR>=<val> - Set a single variable
  bun scripts/sync-env.ts list [service]           - List all variables

Services:
  ${SERVICES.map((s) => s.name).join(', ')}

Examples:
  bun scripts/sync-env.ts check
  bun scripts/sync-env.ts diagnose api
  bun scripts/sync-env.ts sync api services/api/.env.production
  bun scripts/sync-env.ts set api MY_VAR=myvalue
  bun scripts/sync-env.ts list florin
    `)
    process.exit(0)
  }

  const command = args[0]

  switch (command) {
    case 'check':
      await checkCommand(args[1])
      break
    case 'diagnose':
      await diagnoseCommand(args[1])
      break
    case 'sync':
      await syncCommand(args[1], args[2])
      break
    case 'set':
      await setCommand(args[1], args[2])
      break
    case 'list':
      await listCommand(args[1])
      break
    default:
      log(`Unknown command: ${command}`, 'error')
      process.exit(1)
  }
}

main().catch((error) => {
  log(`Error: ${error.message}`, 'error')
  process.exit(1)
})
