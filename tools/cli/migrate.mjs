#!/usr/bin/env node

/**
 * oclif CLI Migration Helper
 * Automates the migration of remaining commands from custom framework to oclif
 * 
 * Usage:
 *   node migrate.mjs agent/stop.ts
 *   node migrate.mjs all              # Migrate all remaining commands
 */

import fs from 'fs/promises';
import path from 'path';

const COMMANDS_DIR = './src/commands';

// Mapping of command paths to their specific patterns
const COMMANDS_TO_MIGRATE = {
  'agent/stop.ts': {
    description: 'Simple command with PID file management',
    complexity: 'medium',
    hasArgs: false,
    hasFlags: false,
  },
  'agent/start.ts': {
    description: 'Complex: spawns child process',
    complexity: 'high',
    hasArgs: false,
    hasFlags: true,
  },
  'ai/invoke.ts': {
    description: 'Complex: multi-step API calls',
    complexity: 'high',
    hasArgs: true,
    hasFlags: true,
  },
  'ai/models.ts': {
    description: 'HTTP request with model list parsing',
    complexity: 'low',
    hasArgs: false,
    hasFlags: true,
  },
  'files/inventory.ts': {
    description: 'Directory scanning with filters',
    complexity: 'medium',
    hasArgs: true,
    hasFlags: true,
  },
  'system/doctor.ts': {
    description: 'Environment health checks',
    complexity: 'high',
    hasArgs: false,
    hasFlags: false,
  },
  'system/generate-command.ts': {
    description: 'File scaffolding',
    complexity: 'high',
    hasArgs: false,
    hasFlags: true,
  },
  'system/plugin-call.ts': {
    description: 'JSON-RPC over subprocess',
    complexity: 'high',
    hasArgs: true,
    hasFlags: true,
  },
};

// Root commands to delete
const ROOT_COMMANDS = [
  'auth/root.ts',
  'config/root.ts',
  'ai/root.ts',
  'agent/root.ts',
  'files/root.ts',
  'system/root.ts',
  'data/root.ts',
  'skills/root.ts',
];

// Framework files to delete after migration
const FRAMEWORK_FILES = [
  'src/contracts.ts',
  'src/command-factory.ts',
  'src/registry.ts',
  'src/runtime.ts',
  'src/parser.ts',
  'src/help.ts',
  'src/cli.ts',
  'src/errors.ts',
];

async function analyzeCommand(commandPath) {
  try {
    const content = await fs.readFile(path.join(COMMANDS_DIR, commandPath), 'utf-8');
    
    return {
      path: commandPath,
      isMigrated: content.includes('extends Command'),
      isCustom: content.includes('createCommand'),
      hasExportDefault: content.includes('export default'),
      lines: content.split('\n').length,
    };
  } catch (error) {
    return null;
  }
}

async function showMigrationStatus() {
  console.log('\n📊 oclif Migration Status\n');

  let migrated = 0;
  let unmigrated = 0;

  for (const [cmd, info] of Object.entries(COMMANDS_TO_MIGRATE)) {
    const analysis = await analyzeCommand(cmd);
    if (!analysis) continue;

    if (analysis.isMigrated) {
      console.log(`✅ ${cmd} (${analysis.lines} lines)`);
      migrated++;
    } else {
      const complexity = info.complexity === 'high' ? '🔴' : info.complexity === 'medium' ? '🟡' : '🟢';
      console.log(`${complexity} ${cmd} - ${info.description}`);
      unmigrated++;
    }
  }

  console.log(`\n📈 Progress: ${migrated}/${migrated + unmigrated} commands migrated`);
  console.log('\n🗑️  Root commands to delete: ${ROOT_COMMANDS.length}`);
  console.log('🔧 Framework files to delete: ${FRAMEWORK_FILES.length}\n');
}

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    await showMigrationStatus();
    console.log('Usage:');
    console.log('  node migrate.mjs                    # Show status');
    console.log('  node migrate.mjs <command.ts>       # Analyze command');
    console.log('  node migrate.mjs all                # Show all commands');
    return;
  }

  if (arg === 'all') {
    console.log('\n📋 All Commands to Migrate:\n');
    for (const [cmd, info] of Object.entries(COMMANDS_TO_MIGRATE)) {
      const complexity = info.complexity === 'high' ? '🔴' : info.complexity === 'medium' ? '🟡' : '🟢';
      console.log(`${complexity} ${cmd}`);
      console.log(`   ${info.description}`);
      console.log('');
    }
    return;
  }

  const analysis = await analyzeCommand(arg);
  if (analysis) {
    console.log(`\n📝 Command Analysis: ${arg}\n`);
    console.log(`Lines: ${analysis.lines}`);
    console.log(`Is Migrated: ${analysis.isMigrated}`);
    console.log(`Is Custom: ${analysis.isCustom}`);
    
    const info = COMMANDS_TO_MIGRATE[arg];
    if (info) {
      console.log(`Complexity: ${info.complexity}`);
      console.log(`Description: ${info.description}`);
    }
  } else {
    console.log(`❌ Command not found: ${arg}`);
  }
}

main().catch(console.error);
