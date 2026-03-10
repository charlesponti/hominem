import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface ServiceConfig {
  name: string;
  envFiles: string[];
  railwayService: string;
}

export interface EnvMismatch {
  name: string;
  local: string;
  railway: string;
}

export interface EnvComparison {
  missing: string[];
  extra: string[];
  mismatch: EnvMismatch[];
  status: 'ok' | 'missing' | 'extra' | 'mismatch';
}

export const SERVICE_CONFIGS: ServiceConfig[] = [
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
    envFiles: ['apps/finance/.env.production', 'apps/finance/.env'],
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
];

const RAILWAY_SYSTEM_VARS = new Set([
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
]);

export function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return SERVICE_CONFIGS.find((service) => service.name === serviceName);
}

export function findLocalEnvFile(config: ServiceConfig, cwd = process.cwd()): string | null {
  for (const relativePath of config.envFiles) {
    const fullPath = path.join(cwd, relativePath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export function getPrimaryEnvFile(config: ServiceConfig, cwd = process.cwd()): string {
  return path.join(cwd, config.envFiles[0]);
}

export function parseEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>();

  if (!existsSync(filePath)) {
    return vars;
  }

  const content = readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    vars.set(name, rawValue.replace(/^["']|["']$/g, ''));
  }

  return vars;
}

export function writeEnvFile(filePath: string, vars: Map<string, string>): void {
  mkdirSync(path.dirname(filePath), { recursive: true });

  const lines = Array.from(vars.entries()).map(([name, value]) => {
    if (value.includes(' ') || value.includes('\n')) {
      return `${name}="${value}"`;
    }

    return `${name}=${value}`;
  });

  writeFileSync(filePath, `${lines.join('\n')}\n`);
}

export function compareEnvVars(
  localVars: Map<string, string>,
  railwayVars: Map<string, string>,
): EnvComparison {
  const missing: string[] = [];
  const extra: string[] = [];
  const mismatch: EnvMismatch[] = [];

  for (const [name, localValue] of localVars) {
    const railwayValue = railwayVars.get(name);
    if (railwayValue === undefined) {
      missing.push(name);
      continue;
    }

    if (railwayValue !== localValue) {
      mismatch.push({
        name,
        local: localValue,
        railway: railwayValue,
      });
    }
  }

  for (const [name] of railwayVars) {
    if (
      localVars.has(name) ||
      RAILWAY_SYSTEM_VARS.has(name) ||
      name.startsWith('RAILWAY_SERVICE_')
    ) {
      continue;
    }

    extra.push(name);
  }

  let status: EnvComparison['status'] = 'ok';
  if (missing.length > 0) {
    status = 'missing';
  }
  if (extra.length > 0) {
    status = 'extra';
  }
  if (mismatch.length > 0) {
    status = 'mismatch';
  }

  return {
    missing,
    extra,
    mismatch,
    status,
  };
}

export function maskSecretValue(value: string): string {
  if (value.length === 0) {
    return '<empty>';
  }

  return '<redacted>';
}
