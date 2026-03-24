import { Flags, Command } from '@oclif/core';
import { z } from 'zod';

import type { JsonValue } from '@/contracts';

import { requestJson } from '@/http';
import { parseJsonPayload } from '@/http';
import { validateWithZod } from '@/utils/zod-validation';

function toStringRecord(input: Record<string, JsonValue>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      result[key] = value;
      continue;
    }
    result[key] = JSON.stringify(value);
  }
  return result;
}

function normalizeAccounts(raw: string): Array<Record<string, string>> {
  const parsed = parseJsonPayload(raw, '/api/finance/accounts');
  if (Array.isArray(parsed)) {
    const rows: Array<Record<string, string>> = [];
    for (const item of parsed) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        rows.push(toStringRecord(item as Record<string, JsonValue>));
      }
    }
    if (rows.length > 0) {
      return rows;
    }
  }
  if (typeof parsed === 'object' && parsed !== null && 'accounts' in parsed) {
    const value = (parsed as Record<string, JsonValue>).accounts;
    if (Array.isArray(value)) {
      const rows: Array<Record<string, string>> = [];
      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          rows.push(toStringRecord(item as Record<string, JsonValue>));
        }
      }
      if (rows.length > 0) {
        return rows;
      }
    }
  }
  throw new Error('Accounts response did not include an account list');
}

const outputSchema = z.object({
  baseUrl: z.string(),
  accountCount: z.number(),
  accounts: z.array(z.record(z.string(), z.string())),
});

export default class DataAccounts extends Command {
  static description = 'List account data';
  static summary = 'List account data';

  static override flags = {
    baseUrl: Flags.string({
      description: 'API base URL',
      default: 'http://localhost:4040',
    }),
  };

  static enableJsonFlag = true;

  async run(): Promise<z.infer<typeof outputSchema>> {
    const { flags } = await this.parse(DataAccounts);

    let accounts: Array<Record<string, string>>;
    try {
      const raw = await requestJson({
        baseUrl: flags.baseUrl,
        path: '/api/finance/accounts',
      });
      accounts = normalizeAccounts(raw);
    } catch (error) {
      this.error(error instanceof Error ? error.message : 'Failed to fetch accounts', {
        exit: 3,
        code: 'DEPENDENCY_RESPONSE_INVALID',
      });
    }

    const output = {
      baseUrl: flags.baseUrl,
      accountCount: accounts.length,
      accounts,
    };

    validateWithZod(outputSchema, output);
    return output;
  }
}
