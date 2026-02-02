#!/usr/bin/env bun

/**
 * Type Performance Dashboard Generator
 * 
 * Generates an interactive HTML dashboard from type audit JSON data.
 * 
 * Usage:
 *   bun run scripts/generate-dashboard.ts --input <audit.json> --output <dashboard.html>
 *   bun run scripts/generate-dashboard.ts --audit-first [--threshold 1.0]
 * 
 * Examples:
 *   # Generate from existing audit
 *   bun run scripts/generate-dashboard.ts --input .type-analysis/report.json
 * 
 *   # Run audit first, then generate
 *   bun run scripts/generate-dashboard.ts --audit-first --threshold 0.5
 * 
 *   # Open in browser automatically
 *   bun run scripts/generate-dashboard.ts --input report.json --open
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

interface DashboardOptions {
  input?: string;
  output: string;
  auditFirst: boolean;
  open: boolean;
  threshold: number;
}

function parseArgs(): DashboardOptions {
  const args = process.argv.slice(2);
  const options: DashboardOptions = {
    output: './type-performance-dashboard.html',
    auditFirst: false,
    open: false,
    threshold: 1.0,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) options.input = args[i + 1];
    if (args[i] === '--output' && args[i + 1]) options.output = args[i + 1];
    if (args[i] === '--audit-first') options.auditFirst = true;
    if (args[i] === '--open') options.open = true;
    if (args[i] === '--threshold' && args[i + 1]) options.threshold = Number.parseFloat(args[i + 1]);
  }

  return options;
}

function loadDashboardTemplate(): string {
  const templatePath = join(ROOT, 'scripts/type-dashboard.html');
  if (!existsSync(templatePath)) {
    throw new Error(`Dashboard template not found at ${templatePath}`);
  }
  return readFileSync(templatePath, 'utf-8');
}

function runAudit(threshold: number): string {
  console.log(`🔍 Running type audit with threshold ${threshold}s...\n`);

  const outputFile = join(ROOT, '.type-analysis', 'dashboard-data.json');

  try {
    execSync(
      `bun run scripts/type-performance.ts audit --json ${outputFile} --threshold ${threshold} --graph`,
      {
        cwd: ROOT,
        stdio: 'inherit',
      }
    );
    return outputFile;
  } catch (error) {
    // Audit may exit with non-zero if there are slow files, but still generate output
    if (existsSync(outputFile)) {
      return outputFile;
    }
    throw error;
  }
}

function generateDashboard(inputFile: string, outputFile: string) {
  console.log(`📊 Generating dashboard...`);

  // Load data
  const data = JSON.parse(readFileSync(inputFile, 'utf-8'));

  // Load template
  let template = loadDashboardTemplate();

  // Inject data
  const dataJson = JSON.stringify(data);
  template = template.replace('{{DATA_PLACEHOLDER}}', dataJson);

  // Write output
  writeFileSync(outputFile, template);

  console.log(`✅ Dashboard generated: ${outputFile}`);

  return outputFile;
}

function openDashboard(filePath: string) {
  console.log(`🌐 Opening dashboard...`);

  const platform = process.platform;
  let command: string;

  if (platform === 'darwin') {
    command = `open "${filePath}"`;
  } else if (platform === 'win32') {
    command = `start "${filePath}"`;
  } else {
    command = `xdg-open "${filePath}"`;
  }

  try {
    execSync(command, { stdio: 'ignore' });
    console.log(`✅ Opened in browser`);
  } catch {
    console.log(`⚠️  Could not open automatically. Please open manually: ${filePath}`);
  }
}

async function main() {
  const options = parseArgs();

  // Determine input file
  let inputFile = options.input;

  if (options.auditFirst || !inputFile) {
    inputFile = runAudit(options.threshold);
  }

  if (!existsSync(inputFile!)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.error('Run with --audit-first to generate audit data first');
    process.exit(1);
  }

  // Generate dashboard
  const outputPath = join(ROOT, options.output);
  generateDashboard(inputFile!, outputPath);

  // Open if requested
  if (options.open) {
    openDashboard(outputPath);
  }

  console.log(`\n📊 Dashboard Summary:`);
  console.log(`   Input: ${inputFile}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`   • Open the dashboard in your browser to explore the data`);
  console.log(`   • Check the "Recommendations" tab for actionable fixes`);
  console.log(`   • Use the "Dependency Graph" to understand type relationships`);
}

main().catch((err) => {
  console.error('❌ Dashboard generation failed:', err);
  process.exit(1);
});
