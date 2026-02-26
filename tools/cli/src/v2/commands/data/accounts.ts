import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { CliError } from '../../errors'
import { requestJson } from '../../http'
import { parseJsonPayload } from '../../http'
import type { JsonValue } from '../../contracts'

function toStringRecord(input: Record<string, JsonValue>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      result[key] = value
      continue
    }
    result[key] = JSON.stringify(value)
  }
  return result
}

function normalizeAccounts(raw: string): Array<Record<string, string>> {
  const parsed = parseJsonPayload(raw, '/api/finance/accounts')
  if (Array.isArray(parsed)) {
    const rows: Array<Record<string, string>> = []
    for (const item of parsed) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        rows.push(toStringRecord(item as Record<string, JsonValue>))
      }
    }
    if (rows.length > 0) {
      return rows
    }
  }
  if (typeof parsed === 'object' && parsed !== null && 'accounts' in parsed) {
    const value = (parsed as Record<string, JsonValue>).accounts
    if (Array.isArray(value)) {
      const rows: Array<Record<string, string>> = []
      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          rows.push(toStringRecord(item as Record<string, JsonValue>))
        }
      }
      if (rows.length > 0) {
        return rows
      }
    }
  }
  throw new CliError({
    code: 'DEPENDENCY_RESPONSE_INVALID',
    category: 'dependency',
    message: 'Accounts response did not include an account list'
  })
}

export default createCommand({
  name: 'data accounts',
  summary: 'List account data',
  description: 'Fetches finance account data from API.',
  argNames: [],
  args: z.object({}),
  flags: z.object({
    baseUrl: z.string().default('http://localhost:4040')
  }),
  outputSchema: z.object({
    baseUrl: z.string(),
    accountCount: z.number(),
    accounts: z.array(z.record(z.string(), z.string()))
  }),
  async run({ flags, context }) {
    const raw = await requestJson({
      baseUrl: flags.baseUrl,
      path: '/api/finance/accounts',
      abortSignal: context.abortSignal
    })
    const accounts = normalizeAccounts(raw)

    return {
      baseUrl: flags.baseUrl,
      accountCount: accounts.length,
      accounts
    }
  }
})
