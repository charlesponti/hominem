#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const repoRoot = process.cwd();
const apiEnvFile = `${repoRoot}/services/api/.env`;
const args = new Set(process.argv.slice(2));
const liveOnly = args.has('--live-only');
const staticOnly = args.has('--static-only');
const authenticated = args.has('--authenticated');
const strictDependencies = args.has('--strict-dependencies');
const deployment = args.has('--deployment');
const agentSkillsRoot = process.env.AGENTS_SKILLS_DIR ?? `${process.env.HOME}/.agents/skills`;

function log(message) {
  console.log(`[security] ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!match) return [];
        return [[match[1], match[2].replace(/^"|"$/g, '')]];
      }),
  );
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (options.capture) return result;
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} exited ${result.status}`);
  return result;
}

function runStaticChecks() {
  if (staticOnly || !liveOnly) {
    log('validating structured findings');
    run(process.execPath, [
      `${agentSkillsRoot}/cloudflare-security-audit/validate-findings.cjs`,
      'security-audits/2026-08-11/findings.json',
    ]);

    log('scanning tracked files for high-confidence secrets');
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot }).toString().split('\0');
    const patterns = [
      /AKIA[0-9A-Z]{16}/,
      /gh[pousr]_[A-Za-z0-9]{20,}/,
      /sk-(?:live|test)-[A-Za-z0-9]{16,}/,
      /sk-ant-[A-Za-z0-9_-]{16,}/,
      /xox[baprs]-[A-Za-z0-9-]{20,}/,
      /-----BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY-----/,
    ];
    const matches = [];
    for (const file of files) {
      if (!file || file.endsWith('pnpm-lock.yaml')) continue;
      let content;
      try {
        content = readFileSync(`${repoRoot}/${file}`, 'utf8');
      } catch {
        continue;
      }
      content.split('\n').forEach((line, index) => {
        if (patterns.some((pattern) => pattern.test(line))) matches.push(`${file}:${index + 1}`);
      });
    }
    if (matches.length > 0) fail(`possible secrets found at ${matches.join(', ')}`);
    log('tracked secret scan passed');

    log('running dependency audit');
    const audit = run('pnpm', ['audit', '--json'], { capture: true });
    const auditText = `${audit.stdout}\n${audit.stderr}`;
    let auditJson;
    try {
      auditJson = JSON.parse(audit.stdout);
    } catch {
      if (audit.status !== 0) fail(`pnpm audit did not return JSON: ${auditText.slice(0, 500)}`);
    }
    const counts = auditJson?.metadata?.vulnerabilities;
    if (counts) {
      log(
        `dependency advisories: critical=${counts.critical} high=${counts.high} moderate=${counts.moderate} low=${counts.low}`,
      );
      if (strictDependencies && Object.values(counts).some((count) => count > 0)) {
        fail('dependency advisories found with --strict-dependencies');
      }
    }

    if (!args.has('--skip-tests')) {
      log('running API security tests');
      run('pnpm', ['--filter', '@hominem/api', 'test']);
      log('running AI security-adjacent tests');
      run('pnpm', ['--filter', '@hominem/ai', 'test']);
    }
  }
}

async function request(base, path, options = {}) {
  const response = await fetch(new URL(path, base), options);
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep short text responses readable in failures.
  }
  return { response, body };
}

function expectStatus(label, result, expected) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(result.response.status)) {
    fail(`${label}: expected ${allowed.join('/')} but received ${result.response.status}`);
  }
  log(`${label}: ${result.response.status}`);
}

function expectHeader(label, response, name, expected) {
  const actual = response.headers.get(name);
  if (actual !== expected) fail(`${label}: expected ${name}=${expected} but received ${actual}`);
  log(`${label}: ${name} verified`);
}

function getCookies(response) {
  const cookies =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  return cookies.map((cookie) => cookie.split(';', 1)[0]).join('; ');
}

async function runLiveChecks() {
  if (staticOnly) return;
  const env = readEnvFile(apiEnvFile);
  const base = deployment
    ? process.env.SECURITY_AUDIT_DEPLOYMENT_URL || 'https://api.ponti.io'
    : env.API_URL || 'http://127.0.0.1:4040';
  log(`probing ${base}`);

  const health = await request(base, '/api/status');
  expectStatus('health', health, 200);
  expectStatus('unauthenticated session', await request(base, '/api/auth/session'), 401);

  if (deployment) {
    for (const [name, value] of [
      ['strict-transport-security', 'max-age=31536000; includeSubDomains'],
      ['content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"],
      ['permissions-policy', 'geolocation=(), microphone=(), camera=()'],
      ['referrer-policy', 'strict-origin-when-cross-origin'],
      ['x-content-type-options', 'nosniff'],
    ]) {
      expectHeader('deployment security headers', health.response, name, value);
    }
    const docs = await request(base, '/docs');
    if (docs.response.headers.has('content-security-policy')) {
      fail('deployment docs unexpectedly received API CSP');
    }
    log('deployment docs CSP exclusion verified');

    const evilCors = await request(base, '/api/status', {
      headers: { origin: 'https://evil.example' },
    });
    if (evilCors.response.headers.has('access-control-allow-origin')) {
      fail('deployment accepted an evil CORS origin');
    }
    log('deployment evil-origin CORS rejection verified');

    const spoofedA = await request(base, '/api/auth/mobile/e2e/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 20) + 1}`,
      },
      body: '{}',
    });
    const spoofedB = await request(base, '/api/auth/mobile/e2e/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 20) + 21}`,
      },
      body: '{}',
    });
    if (
      spoofedA.response.headers.get('x-ratelimit-remaining') === null ||
      spoofedB.response.headers.get('x-ratelimit-remaining') === null
    ) {
      fail('deployment did not expose the expected auth rate-limit headers');
    }
    log('deployment forwarding-header rate-limit probe completed');
  }
  for (const path of [
    '/api/career/profile',
    '/api/personal/finance/monthly-summary',
    '/api/finance/transactions/list',
  ]) {
    expectStatus(`protected ${path}`, await request(base, path), 401);
  }
  expectStatus('MCP without credentials', await request(base, '/api/mcp'), 401);
  expectStatus(
    'MCP with invalid bearer token',
    await request(base, '/api/mcp', {
      headers: { authorization: 'Bearer security-audit-invalid' },
    }),
    401,
  );
  expectStatus(
    'E2E login without secret',
    await request(base, '/api/auth/mobile/e2e/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }),
    [403, 404],
  );
  expectStatus(
    'test OTP without secret',
    await request(base, '/api/auth/test/otp/latest?email=security-audit%40hominem.test'),
    [403, 404],
  );
  expectStatus(
    'OAuth protected-resource discovery',
    await request(base, '/.well-known/oauth-protected-resource/api/mcp'),
    200,
  );

  const evilImage = await request(
    base,
    `/api/images/proxy?url=${encodeURIComponent('http://127.0.0.1:4040/api/status')}`,
  );
  if (evilImage.response.status === 200) fail('image proxy accepted a loopback URL');
  log(`image proxy loopback rejection: ${evilImage.response.status}`);

  if (!authenticated) return;
  if (env.AUTH_E2E_ENABLED !== 'true' || env.NODE_ENV === 'production') {
    fail('--authenticated requires AUTH_E2E_ENABLED=true and a non-production NODE_ENV');
  }
  if (!env.AUTH_E2E_SECRET) fail('--authenticated requires AUTH_E2E_SECRET in services/api/.env');

  const stamp = Date.now();
  const emails = [
    `security-audit-owner-${stamp}@hominem.test`,
    `security-audit-other-${stamp}@hominem.test`,
  ];
  const createdUserIds = [];
  let ownerCookie = '';
  let otherCookie = '';
  try {
    async function login(email) {
      const result = await request(base, '/api/auth/mobile/e2e/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e2e-auth-secret': env.AUTH_E2E_SECRET },
        body: JSON.stringify({ email, name: 'Security Audit Test' }),
      });
      expectStatus(`E2E login ${email}`, result, 200);
      const userId = result.body?.user?.id;
      if (!userId) fail(`E2E login ${email} did not return a user id`);
      createdUserIds.push(userId);
      return getCookies(result.response);
    }

    ownerCookie = await login(emails[0]);
    otherCookie = await login(emails[1]);
    if (!ownerCookie || !otherCookie) fail('E2E login did not return session cookies');

    expectStatus(
      'authenticated owner profile',
      await request(base, '/api/career/profile', { headers: { cookie: ownerCookie } }),
      200,
    );
    expectStatus(
      'authenticated other profile',
      await request(base, '/api/career/profile', { headers: { cookie: otherCookie } }),
      200,
    );

    const created = await request(base, '/api/career/wishlist', {
      method: 'POST',
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ company: `security-audit-${stamp}` }),
    });
    expectStatus('owner creates wishlist record', created, 201);
    const recordId = created.body?.company?.id;
    if (!recordId) fail('wishlist create did not return a record id');

    expectStatus(
      'other cannot delete owner wishlist record',
      await request(base, `/api/career/wishlist/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
        headers: { cookie: otherCookie },
      }),
      404,
    );
    expectStatus(
      'owner deletes own wishlist record',
      await request(base, `/api/career/wishlist/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
        headers: { cookie: ownerCookie },
      }),
      200,
    );
    expectStatus(
      'invalid wishlist input',
      await request(base, '/api/career/wishlist', {
        method: 'POST',
        headers: { cookie: ownerCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ company: '' }),
      }),
      400,
    );
  } finally {
    if (createdUserIds.length > 0 && env.DATABASE_URL) {
      const sql = `DELETE FROM "user" WHERE id IN (${createdUserIds.map((id) => `'${id.replaceAll("'", "''")}'`).join(',')});`;
      const psqlCommand = existsSync('/opt/homebrew/opt/postgresql@18/bin/psql')
        ? '/opt/homebrew/opt/postgresql@18/bin/psql'
        : 'psql';
      const psql = spawnSync(
        psqlCommand,
        [env.DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-Atc', sql],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      if (psql.status === 0) log(`cleaned up ${createdUserIds.length} temporary E2E user(s)`);
      else console.warn(`[security] cleanup warning: ${psql.stderr.trim() || 'psql unavailable'}`);
    }
  }
}

try {
  if (!liveOnly) runStaticChecks();
  await runLiveChecks();
  log('security audit checks passed');
} catch (error) {
  console.error(`[security] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
