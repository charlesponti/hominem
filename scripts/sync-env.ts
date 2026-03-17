#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  SERVICE_CONFIGS,
  compareEnvVars,
  findLocalEnvFile,
  getServiceConfig,
  parseEnvFile,
} from './lib/env-tooling';
import { runCommand } from './lib/run-command';

function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const colors = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m',
    reset: '\x1b[0m',
  };
  const prefix = {
    info: 'ℹ ',
    warn: '⚠ ',
    error: '✗ ',
    success: '✓ ',
  };
  console.log(`${colors[level]}${prefix[level]}${message}${colors.reset}`);
}

function getRailwayVars(service: string): Map<string, string> {
  const serviceNames = [service];
  if (service.startsWith('hominem-')) {
    serviceNames.push(service.replace('hominem-', ''));
  }

  for (const serviceName of serviceNames) {
    const result = runCommand(
      'railway',
      ['variable', 'list', '--service', serviceName, '--kv'],
      true,
    );

    if (result.code !== 0 || !result.stdout) {
      continue;
    }

    const vars = new Map<string, string>();
    for (const line of result.stdout.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        vars.set(name, value);
      }
    }

    return vars;
  }

  return new Map<string, string>();
}

function setRailwayVar(service: string, name: string, value: string): void {
  runCommand('railway', [
    'variable',
    'set',
    `${name}=${value}`,
    '--service',
    service,
    '--skip-deploys',
  ]);
}

async function checkCommand(serviceName?: string) {
  log('Checking environment variable synchronization...', 'info');

  const services = serviceName
    ? SERVICE_CONFIGS.filter((service) => service.name === serviceName)
    : SERVICE_CONFIGS;

  if (serviceName && services.length === 0) {
    log(`Service not found: ${serviceName}`, 'error');
    process.exit(1);
  }

  let allOk = true;

  for (const service of services) {
    const envFilePath = findLocalEnvFile(service);
    if (!envFilePath) {
      log(`No .env file found for ${service.name}`, 'warn');
      continue;
    }

    const localVars = parseEnvFile(envFilePath);
    const railwayVars = getRailwayVars(service.railwayService);
    const result = compareEnvVars(localVars, railwayVars);

    if (result.status === 'ok') {
      log(`${service.name}: All variables synchronized`, 'success');
    } else {
      allOk = false;
      if (result.missing.length > 0) {
        log(`${service.name}: Missing ${result.missing.length} variables in Railway`, 'error');
      }
      if (result.extra.length > 0) {
        log(`${service.name}: ${result.extra.length} extra variables in Railway`, 'warn');
      }
      if (result.mismatch.length > 0) {
        log(`${service.name}: ${result.mismatch.length} mismatched variable values`, 'error');
      }
    }
  }

  process.exit(allOk ? 0 : 1);
}

async function diagnoseCommand(serviceName?: string) {
  log('Diagnosing environment variable mismatches...', 'info');
  console.log('');

  const services = serviceName
    ? SERVICE_CONFIGS.filter((service) => service.name === serviceName)
    : SERVICE_CONFIGS;

  if (serviceName && services.length === 0) {
    log(`Service not found: ${serviceName}`, 'error');
    process.exit(1);
  }

  for (const service of services) {
    const envFilePath = findLocalEnvFile(service);
    if (!envFilePath) {
      log(`No .env file found for ${service.name}`, 'warn');
      continue;
    }

    log(`\n=== ${service.name} (Railway: ${service.railwayService}) ===`, 'info');

    const localVars = parseEnvFile(envFilePath);
    const railwayVars = getRailwayVars(service.railwayService);
    const result = compareEnvVars(localVars, railwayVars);

    log(`Local variables: ${localVars.size}`, 'info');
    log(`Railway variables: ${railwayVars.size}`, 'info');

    if (result.missing.length > 0) {
      log(`\nMissing from Railway (${result.missing.length}):`, 'error');
      for (const varName of result.missing) {
        console.log(`  - ${varName}`);
      }
    }

    if (result.extra.length > 0) {
      log(`\nExtra in Railway (${result.extra.length}):`, 'warn');
      for (const varName of result.extra.slice(0, 10)) {
        console.log(`  - ${varName}`);
      }
      if (result.extra.length > 10) {
        console.log(`  ... and ${result.extra.length - 10} more`);
      }
    }

    if (result.mismatch.length > 0) {
      log(`\nMismatched values (${result.mismatch.length}):`, 'error');
      for (const mismatch of result.mismatch) {
        console.log(`  - ${mismatch.name}`);
      }
    }

    if (result.status === 'ok') {
      log('✓ All variables synchronized', 'success');
    }
  }

  console.log('');
}

async function syncCommand(serviceName: string, envFile: string) {
  const service = getServiceConfig(serviceName);
  if (!service) {
    log(`Service not found: ${serviceName}`, 'error');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), envFile);
  if (!existsSync(filePath)) {
    log(`File not found: ${envFile}`, 'error');
    process.exit(1);
  }

  log(`Syncing ${envFile} to Railway (${service.railwayService})...`, 'info');

  const localVars = parseEnvFile(filePath);
  let synced = 0;
  let failed = 0;

  for (const [name, value] of localVars) {
    try {
      setRailwayVar(service.railwayService, name, value);
      log(`  ${name}`, 'success');
      synced++;
    } catch (error) {
      log(`  ${name} (FAILED)`, 'error');
      log(error instanceof Error ? error.message : 'Unknown Railway CLI failure', 'error');
      failed++;
    }
  }

  console.log('');
  log(`Sync complete: ${synced} variables updated`, 'success');
  if (failed > 0) {
    log(`${failed} variables failed to sync`, 'error');
  }

  process.exit(failed > 0 ? 1 : 0);
}

async function setCommand(serviceName: string, varAssignment: string) {
  const service = getServiceConfig(serviceName);
  if (!service) {
    log(`Service not found: ${serviceName}`, 'error');
    process.exit(1);
  }

  const [name, ...valueParts] = varAssignment.split('=');
  const value = valueParts.join('=');

  if (!name || !value) {
    log('Invalid format. Use: bun scripts/sync-env.ts set <service> <VAR>=<value>', 'error');
    process.exit(1);
  }

  log(`Setting ${name} in Railway (${service.railwayService})...`, 'info');

  try {
    setRailwayVar(service.railwayService, name, value);
    log(`Successfully set ${name}`, 'success');
  } catch (error) {
    log(`Failed to set ${name}`, 'error');
    log(error instanceof Error ? error.message : 'Unknown Railway CLI failure', 'error');
    process.exit(1);
  }
}

async function listCommand(serviceName?: string) {
  const services = serviceName
    ? SERVICE_CONFIGS.filter((service) => service.name === serviceName)
    : SERVICE_CONFIGS;

  if (serviceName && services.length === 0) {
    log(`Service not found: ${serviceName}`, 'error');
    process.exit(1);
  }

  for (const service of services) {
    log(`\n=== ${service.name} ===`, 'info');

    const envFilePath = findLocalEnvFile(service);
    if (envFilePath) {
      log('\nLocal variables:', 'info');
      const localVars = parseEnvFile(envFilePath);
      for (const [name] of localVars) {
        console.log(`  ${name}`);
      }
    } else {
      log('No local .env file found', 'warn');
    }

    log('\nRailway variables:', 'info');
    const railwayVars = getRailwayVars(service.railwayService);
    if (railwayVars.size === 0) {
      log('No variables found', 'warn');
    } else {
      for (const [name] of railwayVars) {
        console.log(`  ${name}`);
      }
    }
  }

  console.log('');
}

// Main
async function main() {
  const args = process.argv.slice(2);

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
  ${SERVICE_CONFIGS.map((service) => service.name).join(', ')}

Examples:
  bun scripts/sync-env.ts check
  bun scripts/sync-env.ts diagnose api
  bun scripts/sync-env.ts sync api services/api/.env.production
  bun scripts/sync-env.ts set api MY_VAR=myvalue
  bun scripts/sync-env.ts list api
    `);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'check':
      await checkCommand(args[1]);
      break;
    case 'diagnose':
      await diagnoseCommand(args[1]);
      break;
    case 'sync':
      await syncCommand(args[1], args[2]);
      break;
    case 'set':
      await setCommand(args[1], args[2]);
      break;
    case 'list':
      await listCommand(args[1]);
      break;
    default:
      log(`Unknown command: ${command}`, 'error');
      process.exit(1);
  }
}

main().catch((error) => {
  log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  process.exit(1);
});
