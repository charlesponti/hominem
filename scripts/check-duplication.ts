import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SOURCE_ROOTS = ['apps', 'packages', 'services', 'tools', 'scripts', 'config'];
const IGNORED_DIRS = new Set([
  '.git',
  '.turbo',
  '.react-router',
  'build',
  'coverage',
  'dist',
  'e2e',
  'node_modules',
  'public',
  'storybook-static',
  'test-results',
  'tests',
  '__tests__',
]);
const IGNORED_FILE_PATTERNS = [
  /\.(test|spec)\.[^.]+$/,
  /\.integration\.[^.]+$/,
  /\.mobile\.e2e\.[^.]+$/,
];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

interface JscpdCloneLocation {
  name: string;
  start: number;
  end: number;
  startLoc: {
    line: number;
    column: number;
    position: number;
  };
  endLoc: {
    line: number;
    column: number;
    position: number;
  };
}

interface JscpdDuplicate {
  format: string;
  lines: number;
  tokens: number;
  firstFile: JscpdCloneLocation;
  secondFile: JscpdCloneLocation;
}

interface JscpdReport {
  duplicates: JscpdDuplicate[];
}

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function collectSourceFiles(rootDir: string, collectedFiles: string[]): void {
  if (!fs.existsSync(rootDir)) {
    return;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, collectedFiles);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    if (shouldIgnoreFile(fullPath)) {
      continue;
    }

    collectedFiles.push(fullPath);
  }
}

function shouldKeepClone(clone: JscpdDuplicate): boolean {
  const firstPath = clone.firstFile.name;
  const secondPath = clone.secondFile.name;

  return (
    firstPath !== secondPath &&
    !firstPath.includes('storybook-static') &&
    !secondPath.includes('storybook-static')
  );
}

function formatCloneLocation(location: JscpdCloneLocation): string {
  return `${location.name} [${location.startLoc.line}:${location.startLoc.column} - ${location.endLoc.line}:${location.endLoc.column}]`;
}

function formatClone(clone: JscpdDuplicate): string {
  return [
    `Clone found (${clone.format}):`,
    ` - ${formatCloneLocation(clone.firstFile)} (${clone.lines} lines, ${clone.tokens} tokens)`,
    `   ${formatCloneLocation(clone.secondFile)}`,
    '',
  ].join('\n');
}

const sourceFiles: string[] = [];
for (const sourceRoot of SOURCE_ROOTS) {
  collectSourceFiles(path.resolve(sourceRoot), sourceFiles);
}

const reportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hominem-jscpd-'));
const reportPath = path.join(reportDirectory, 'jscpd-report.json');

const result = spawnSync(
  'bunx',
  [
    'jscpd',
    '--format',
    'typescript,javascript',
    '--min-lines',
    '8',
    '--min-tokens',
    '30',
    '--skipLocal',
    '--reporters',
    'json',
    '--output',
    reportDirectory,
    '--exitCode',
    '0',
    ...sourceFiles,
  ],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

if (result.error) {
  fs.rmSync(reportDirectory, { recursive: true, force: true });
  throw result.error;
}

if (result.status !== 0) {
  fs.rmSync(reportDirectory, { recursive: true, force: true });
  throw new Error(result.stderr.trim() || 'duplication check failed');
}

if (!fs.existsSync(reportPath)) {
  fs.rmSync(reportDirectory, { recursive: true, force: true });
  throw new Error(`duplication report was not created at ${reportPath}`);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as JscpdReport;
const filteredClones = report.duplicates.filter((clone) => shouldKeepClone(clone));

for (const clone of filteredClones) {
  process.stdout.write(`${formatClone(clone)}\n`);
}

fs.rmSync(reportDirectory, { recursive: true, force: true });

process.exit(filteredClones.length > 0 ? 1 : 0);
