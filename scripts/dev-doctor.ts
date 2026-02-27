import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

interface CommandResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}

interface CheckResult {
  name: string;
  required: boolean;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

interface PinnedVersions {
  bun: string | null;
  node: string | null;
}

function run(command: string, args: string[] = []): CommandResult {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    shell: false,
  });

  if (result.error) {
    return {
      ok: false,
      code: result.status,
      stdout: '',
      stderr: result.error.message,
    };
  }

  return {
    ok: result.status === 0,
    code: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function checkCommand(
  name: string,
  command: string,
  args: string[],
  required: boolean,
): CheckResult {
  const result = run(command, args);

  if (result.ok) {
    const detail = result.stdout || result.stderr || 'ok';
    return {
      name,
      required,
      status: 'pass',
      detail,
    };
  }

  return {
    name,
    required,
    status: required ? 'fail' : 'warn',
    detail: result.stderr || `failed with code ${String(result.code)}`,
  };
}

function getVersion(command: string, args: string[]): string | null {
  const result = run(command, args);
  if (!result.ok) {
    return null;
  }

  const combined = `${result.stdout}\n${result.stderr}`.trim();
  const [firstLine] = combined.split('\n');
  return firstLine?.trim() ?? null;
}

function readPinnedVersions(): PinnedVersions {
  let bun: string | null = null;
  let node: string | null = null;

  if (existsSync('.tool-versions')) {
    const lines = readFileSync('.tool-versions', 'utf-8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const [tool, version] = line.split(/\s+/, 2);
      if (tool === 'bun' && version) {
        bun = version;
      }
      if (tool === 'node' && version) {
        node = version;
      }
    }
  }

  if (existsSync('.node-version')) {
    const nodeVersion = readFileSync('.node-version', 'utf-8').trim();
    if (nodeVersion) {
      node = nodeVersion;
    }
  }

  return { bun, node };
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, '');
}

function checkPinnedVersion(
  name: string,
  runtimeVersion: string,
  pinnedVersion: string | null,
  required: boolean,
): CheckResult {
  if (!pinnedVersion) {
    return {
      name,
      required,
      status: required ? 'fail' : 'warn',
      detail: 'pinned version not found in .tool-versions/.node-version',
    };
  }

  const runtime = normalizeVersion(runtimeVersion);
  const pinned = normalizeVersion(pinnedVersion);

  const isMatch = runtime === pinned || runtime.startsWith(`${pinned}.`);

  if (isMatch) {
    return {
      name,
      required,
      status: 'pass',
      detail: `runtime ${runtime} matches pinned ${pinned}`,
    };
  }

  return {
    name,
    required,
    status: required ? 'fail' : 'warn',
    detail: `runtime ${runtime} does not match pinned ${pinned}`,
  };
}

function printHeader(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function printChecks(checks: CheckResult[]): void {
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️ ' : '❌';
    const level = check.required ? 'required' : 'recommended';
    console.log(`${icon} ${check.name} (${level})`);
    console.log(`   ${check.detail}`);
  }
}

function runDoctor(): number {
  const checks: CheckResult[] = [];
  const pinnedVersions = readPinnedVersions();
  const bunVersion = getVersion('bun', ['--version']);
  const nodeVersion = getVersion('node', ['--version']);

  checks.push(checkCommand('Bun', 'bun', ['--version'], true));
  checks.push(checkCommand('Node.js', 'node', ['--version'], true));
  checks.push(
    checkPinnedVersion('Pinned Bun version', bunVersion ?? 'unknown', pinnedVersions.bun, true),
  );
  checks.push(
    checkPinnedVersion(
      'Pinned Node.js version',
      nodeVersion ?? 'unknown',
      pinnedVersions.node,
      true,
    ),
  );
  checks.push(checkCommand('Git', 'git', ['--version'], true));
  checks.push(checkCommand('TypeScript CLI', 'npx', ['tsc', '--version'], true));
  checks.push(checkCommand('Watchman', 'watchman', ['--version'], false));

  const isDarwin = process.platform === 'darwin';
  const hasMobileProject = existsSync('apps/mobile');

  if (isDarwin && hasMobileProject) {
    checks.push(checkCommand('Xcode', 'xcodebuild', ['-version'], true));
    checks.push(checkCommand('Xcode Command Line Tools', 'xcode-select', ['-p'], true));
    checks.push(checkCommand('CocoaPods', 'pod', ['--version'], false));
    checks.push(checkCommand('Java (Android toolchain)', 'java', ['-version'], false));
    checks.push(checkCommand('ADB', 'adb', ['version'], false));
  }

  printHeader('Hominem Developer Environment Doctor');
  printChecks(checks);

  const requiredFailures = checks.filter((check) => check.required && check.status === 'fail');

  if (requiredFailures.length > 0) {
    printHeader('Result');
    console.log(`❌ ${requiredFailures.length} required checks failed`);
    return 1;
  }

  const warnings = checks.filter((check) => check.status === 'warn');
  printHeader('Result');

  if (warnings.length > 0) {
    console.log(`✅ Required checks passed (${warnings.length} recommendations to review)`);
  } else {
    console.log('✅ All checks passed');
  }

  return 0;
}

process.exit(runDoctor());
