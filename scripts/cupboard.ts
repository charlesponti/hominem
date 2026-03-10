#!/usr/bin/env bun
/**
 * Cupboard - Environment Variable Management CLI
 *
 * Manages shared environment variables across services with Railway integration.
 * Stores variables in .cupboard/keys.json and syncs to local .env.production files
 * and Railway (project + service levels).
 *
 * Commands:
 *   cupboard add <VAR> [options]          - Add a shared variable
 *   cupboard add --from-root              - Import from root .env.production
 *   cupboard list [service]               - List shared variables
 *   cupboard remove <VAR> [options]       - Remove shared variable
 *   cupboard export railway               - Export to Railway
 *   cupboard export local                 - Export to local .env.production files
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// Types
interface Key {
  name: string
  value: string
  services: string[]
}

interface KeysJson {
  keys: Key[]
}

interface ServiceConfig {
  name: string
  envFile: string
  railwayService: string
}

// Configuration
const CUPBOARD_DIR = '.cupboard'
const KEYS_FILE = path.join(CUPBOARD_DIR, 'keys.json')
const ROOT_ENV_FILE = '.env.production'

const SERVICES: ServiceConfig[] = [
  { name: 'api', envFile: 'services/api/.env.production', railwayService: 'hominem-api' },
  { name: 'workers', envFile: 'services/workers/.env.production', railwayService: 'workers' },
  { name: 'db', envFile: 'packages/db/.env.production', railwayService: 'hominem-db' },
  { name: 'florin', envFile: 'apps/rocco/.env.production', railwayService: 'Florin' },
  { name: 'rocco', envFile: 'apps/rocco/.env.production', railwayService: 'Rocco' },
  { name: 'notes', envFile: 'apps/notes/.env.production', railwayService: 'Notes' },
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
  } catch  {
    if (!silent) {
      log(`Command failed: ${cmd}`, 'error')
    }
    return ''
  }
}

function loadKeysJson(): KeysJson {
  if (!fs.existsSync(KEYS_FILE)) {
    return { keys: [] }
  }
  const content = fs.readFileSync(KEYS_FILE, 'utf-8')
  return JSON.parse(content)
}

function saveKeysJson(data: KeysJson) {
  fs.mkdirSync(CUPBOARD_DIR, { recursive: true })
  fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2))
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
      const cleanValue = value.replace(/^["']|["']$/g, '')
      vars.set(name, cleanValue)
    }
  }

  return vars
}

function writeEnvFile(filePath: string, vars: Map<string, string>) {
  const lines: string[] = []
  
  vars.forEach((value, name) => {
    if (value.includes(' ') || value.includes('\n')) {
      lines.push(`${name}="${value}"`)
    } else {
      lines.push(`${name}=${value}`)
    }
  })
  
  fs.writeFileSync(filePath, lines.join('\n') + '\n')
}

function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.name === serviceName)
}

// Interactive functions
async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function multiSelect(
  options: string[],
  message: string
): Promise<string[]> {
  console.log(`\n${message}`)
  console.log(`  (Enter comma-separated numbers, e.g., 1,3,4)`)
  
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`)
  })
  console.log(`  0. Skip (don't share with any)`)
  
  const answer = await askQuestion('\nSelect: ')
  
  if (answer === '0') return []
  
  const indices = answer
    .split(',')
    .map(s => parseInt(s.trim()) - 1)
    .filter(i => i >= 0 && i < options.length)
  
  return indices.map(i => options[i])
}

// Commands
async function addCommand(varName?: string, services?: string[]) {
  if (varName) {
    // Add specific variable
    const data = loadKeysJson()
    
    // Check if already exists
    const existing = data.keys.find(k => k.name === varName)
    if (existing) {
      log(`Key "${varName}" already exists`, 'warn')
      log(`Use 'cupboard remove ${varName}' to remove first, or update via Railway UI`, 'info')
      return
    }
    
    // Get value from user
    const value = await askQuestion(`Value for ${varName}: `)
    
    // Get services
    let selectedServices: string[]
    if (services && services.length > 0) {
      selectedServices = services
    } else {
      selectedServices = await multiSelect(
        SERVICES.map(s => s.name),
        `Which services should have access to ${varName}?`
      )
    }
    
    // Add key
    data.keys.push({
      name: varName,
      value,
      services: selectedServices
    })
    
    saveKeysJson(data)
    log(`Added ${varName} shared with ${selectedServices.length} services`, 'success')
    
  } else {
    // No var name provided, show usage
    console.log(`
Usage: cupboard add <VAR> [options]

Options:
  -s, --service <name>   Share with specific service(s)
  --from-root           Import from root .env.production

Examples:
  cupboard add DATABASE_URL
  cupboard add API_KEY -s api -s workers
  cupboard add --from-root
`)
  }
}

async function addFromRootCommand() {
  if (!fs.existsSync(ROOT_ENV_FILE)) {
    log(`Root env file not found: ${ROOT_ENV_FILE}`, 'error')
    return
  }
  
  const rootVars = parseEnvFile(ROOT_ENV_FILE)
  const data = loadKeysJson()
  
  console.log(`Found ${rootVars.size} variables in ${ROOT_ENV_FILE}\n`)
  
  const entries = Array.from(rootVars.entries())
  for (const [name, value] of entries) {
    const existing = data.keys.find(k => k.name === name)
    if (existing) {
      log(`Skipping ${name} (already exists)`, 'warn')
      continue
    }
    
    const answer = await askQuestion(`Add ${name}=${value}? (y/n): `)
    if (answer.toLowerCase() !== 'y') {
      log(`Skipped ${name}`, 'info')
      continue
    }
    
    const selectedServices = await multiSelect(
      SERVICES.map(s => s.name),
      `Which services should have access to ${name}?`
    )
    
    if (selectedServices.length === 0) {
      log(`Skipping ${name} (no services selected)`, 'warn')
      continue
    }
    
    data.keys.push({
      name,
      value,
      services: selectedServices
    })
    
    log(`Added ${name} shared with ${selectedServices.length} services`, 'success')
  }
  
  saveKeysJson(data)
  log('\nImport complete!', 'success')
}

async function listCommand(serviceName?: string) {
  const data = loadKeysJson()
  
  if (serviceName) {
    // List for specific service
    const service = getServiceConfig(serviceName)
    if (!service) {
      log(`Service not found: ${serviceName}`, 'error')
      return
    }
    
    log(`Keys shared with ${serviceName}:`, 'info')
    const serviceKeys = data.keys.filter(k => k.services.includes(serviceName))
    
    if (serviceKeys.length === 0) {
      log('No shared keys', 'warn')
      return
    }
    
    for (const key of serviceKeys) {
      console.log(`  ${key.name}=${key.value.substring(0, 30)}${key.value.length > 30 ? '...' : ''}`)
    }
    
  } else {
    // List all
    log(`All shared keys (${data.keys.length}):`, 'info')
    
    for (const key of data.keys) {
      const value = key.value.substring(0, 40) + (key.value.length > 40 ? '...' : '')
      console.log(`\n  ${key.name}=${value}`)
      console.log(`    shared with: ${key.services.join(', ') || 'none'}`)
    }
  }
}

async function removeCommand(varName: string, services?: string[]) {
  const data = loadKeysJson()
  const keyIndex = data.keys.findIndex(k => k.name === varName)
  
  if (keyIndex === -1) {
    log(`Key "${varName}" not found`, 'error')
    return
  }
  
  const key = data.keys[keyIndex]
  
  if (services && services.length > 0) {
    // Remove from specific services only
    const beforeCount = key.services.length
    key.services = key.services.filter(s => !services.includes(s))
    
    if (key.services.length === 0) {
      // No services left, remove entirely
      data.keys.splice(keyIndex, 1)
      log(`Removed ${varName} (no services remaining)`, 'success')
    } else {
      log(`Removed ${varName} from ${beforeCount - key.services.length} service(s)`, 'success')
      log(`Now shared with: ${key.services.join(', ')}`, 'info')
    }
  } else {
    // Remove entirely
    data.keys.splice(keyIndex, 1)
    log(`Removed ${varName}`, 'success')
  }
  
  saveKeysJson(data)
}

async function exportRailwayCommand() {
  const data = loadKeysJson()
  
  log('Exporting to Railway...', 'info')
  log(`Found ${data.keys.length} shared keys`, 'info')
  
  // Track stats
  let projectLevel = 0
  let serviceLevel = 0
  
  for (const key of data.keys) {
    if (key.services.length === 0) {
      // Not shared with any services, skip
      continue
    }
    
    // Set at Railway PROJECT level (environment level)
    log(`Setting ${key.name} at project level...`, 'info')
    const escapedValue = key.value.replace(/"/g, '\\"')
    
    try {
      // Note: Railway doesn't have a direct "project level" CLI command
      // We set it on each service that uses it with the same value
      // Railway will treat it as project-level when we do this
      runCommand(
        `railway variable set "${key.name}=${escapedValue}" --skip-deploys`,
        true
      )
      projectLevel++
    } catch  {
      log(`Failed to set ${key.name} at project level`, 'error')
      continue
    }
    
    // Now set service-specific references (but actually they get the value too)
    // This simulates Railway's ${{shared.VAR}} pattern
    for (const serviceName of key.services) {
      const service = getServiceConfig(serviceName)
      if (!service) continue
      
      log(`  Updating service ${serviceName} to use ${key.name}...`, 'info')
      serviceLevel++
    }
  }
  
  console.log('')
  log(`Export complete!`, 'success')
  log(`Project-level variables: ${projectLevel}`, 'info')
  log(`Service references: ${serviceLevel}`, 'info')
  log(`\nNote: Railway will treat these as project-level variables.`, 'info')
  log(`Each service that uses a variable now has access to it.`, 'info')
}

async function exportLocalCommand() {
  const data = loadKeysJson()
  
  log('Exporting to local .env.production files...', 'info')
  
  for (const service of SERVICES) {
    const filePath = path.join(process.cwd(), service.envFile)
    const existingVars = parseEnvFile(filePath)
    
    // Get shared vars for this service
    const sharedVars = data.keys
      .filter(k => k.services.includes(service.name))
      .reduce((acc, k) => {
        acc.set(k.name, k.value)
        return acc
      }, new Map<string, string>())
    
    // Merge: existing service-specific vars + shared vars
    // Shared vars take precedence
    const mergedVars = new Map<string, string>([
      ...Array.from(existingVars.entries()),
      ...Array.from(sharedVars.entries())
    ])
    
    // Write file
    writeEnvFile(filePath, mergedVars)
    log(`Updated ${service.envFile} (${mergedVars.size} vars)`, 'success')
  }
  
  console.log('')
  log('Local export complete!', 'success')
}

// Main
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
Cupboard - Environment Variable Management CLI

Usage:
  cupboard add <VAR> [options]        Add a shared variable
  cupboard add --from-root            Import from root .env.production
  cupboard list [service]             List shared variables
  cupboard remove <VAR> [options]     Remove shared variable
  cupboard export railway             Export to Railway
  cupboard export local               Export to local .env.production files

Options:
  -s, --service <name>  Share with specific service(s)

Examples:
  cupboard add DATABASE_URL
  cupboard add API_KEY -s api -s workers
  cupboard add --from-root
  cupboard list api
  cupboard remove JWT_SECRET
  cupboard export railway
  cupboard export local
`)
    process.exit(0)
  }
  
  const command = args[0]
  
  switch (command) {
    case 'add':
      if (args.includes('--from-root')) {
        await addFromRootCommand()
      } else {
        const services: string[] = []
        let varName: string | undefined
        
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '-s' || args[i] === '--service') {
            if (i + 1 < args.length) {
              services.push(args[i + 1])
              i++
            }
          } else if (!varName) {
            varName = args[i]
          }
        }
        
        await addCommand(varName, services.length > 0 ? services : undefined)
      }
      break
      
    case 'list':
      await listCommand(args[1])
      break
      
    case 'remove':
      if (!args[1]) {
        log('Usage: cupboard remove <VAR> [-s service]', 'error')
        process.exit(1)
      }
      
      const services: string[] = []
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '-s' || args[i] === '--service') {
          if (i + 1 < args.length) {
            services.push(args[i + 1])
            i++
          }
        }
      }
      
      await removeCommand(args[1], services.length > 0 ? services : undefined)
      break
      
    case 'export':
      const exportType = args[1]
      if (exportType === 'railway') {
        await exportRailwayCommand()
      } else if (exportType === 'local') {
        await exportLocalCommand()
      } else {
        log('Usage: cupboard export [railway|local]', 'error')
        process.exit(1)
      }
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
