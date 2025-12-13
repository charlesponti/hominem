import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from '@notionhq/client'
import chalk from 'chalk'
import Table from 'cli-table3'
import { Command } from 'commander'
import { z } from 'zod'

type NotionResult = {
  id: string
  created_time?: string
  last_edited_time?: string
  properties?: Record<string, unknown>
}

const NotionConfigSchema = z.object({
  NOTION_TOKEN: z.string().min(1, 'Notion integration token is required'),
  NOTION_DATABASE_ID: z.string().min(1, 'Notion database ID is required'),
})

const QueryOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(100),
  startCursor: z.string().optional(),
  filter: z.string().optional(),
  sort: z.string().optional(),
  output: z.enum(['table', 'json', 'csv']).default('table'),
  outputFile: z.string().optional(),
})

type QueryOptions = z.infer<typeof QueryOptionsSchema>

export const pullCommand = new Command('pull')
  .description('Pull data from a Notion database')
  .option('-l, --limit <number>', 'Maximum number of results to fetch (1-100)', '100')
  .option('-c, --cursor <string>', 'Pagination cursor for next page')
  .option('-f, --filter <string>', 'Filter query (JSON string)')
  .option('-s, --sort <string>', 'Sort query (JSON string)')
  .option('-o, --output <format>', 'Output format: table, json, csv', 'table')
  .option('--output-file <file>', 'Output file path (optional)')
  .action(async (options) => {
    try {
      // Validate environment variables
      const config = NotionConfigSchema.parse({
        NOTION_TOKEN: process.env.NOTION_TOKEN,
        NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
      })

      // Validate and parse options
      const queryOptions = QueryOptionsSchema.parse({
        limit: Number.parseInt(options.limit, 10),
        startCursor: options.cursor,
        filter: options.filter ? JSON.parse(options.filter) : undefined,
        sort: options.sort ? JSON.parse(options.sort) : undefined,
        output: options.output,
        outputFile: options.outputFile,
      })

      // Initialize Notion client
      const notion = new Client({
        auth: config.NOTION_TOKEN,
      })

      // Query the database
      const response = await notion.databases.query({
        database_id: config.NOTION_DATABASE_ID,
        page_size: queryOptions.limit,
        start_cursor: queryOptions.startCursor,
        filter: queryOptions.filter as any,
        sorts: queryOptions.sort as any,
      })

      const results = response.results
      const hasMore = response.has_more
      const _nextCursor = response.next_cursor
      if (hasMore) {
      }

      // Process and display results
      await displayResults(results as NotionResult[], queryOptions)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(chalk.red('❌ Configuration error:'))
        error.errors.forEach((err) => {
          console.error(chalk.red(`  - ${err.path.join('.')}: ${err.message}`))
        })
        console.error(
          chalk.yellow(
            '\n💡 Make sure to set NOTION_TOKEN and NOTION_DATABASE_ID environment variables'
          )
        )
        console.error(chalk.yellow('   You can create a .env file or export them in your shell'))
      } else {
        console.error(chalk.red('❌ Error fetching data from Notion:'), error)
      }
      process.exit(1)
    }
  })

async function displayResults(results: NotionResult[], options: QueryOptions) {
  if (results.length === 0) {
    return
  }

  let output: string

  switch (options.output) {
    case 'json':
      output = JSON.stringify(results, null, 2)
      break
    case 'csv':
      output = convertToCSV(results)
      break
    case 'table':
    default:
      output = convertToTable(results)
      break
  }

  if (options.outputFile) {
    const filePath = join(process.cwd(), options.outputFile)
    writeFileSync(filePath, output)
  } else {
  }
}

function convertToTable(results: NotionResult[]): string {
  if (results.length === 0) return ''

  // Get all unique property keys from all results
  const allKeys = new Set<string>()
  for (const result of results) {
    if ('properties' in result && result.properties) {
      for (const key of Object.keys(result.properties)) {
        allKeys.add(key)
      }
    }
  }

  const headers = ['ID', 'Created', 'Last Edited', ...Array.from(allKeys)]
  const table = new Table({
    head: headers,
    colWidths: [20, 20, 20, ...Array(allKeys.size).fill(30)],
  })

  results.forEach((result) => {
    const row = [
      result.id || '',
      'created_time' in result ? formatDate(result.created_time) : '',
      'last_edited_time' in result ? formatDate(result.last_edited_time) : '',
    ]

    // Add property values
    Array.from(allKeys).forEach((key) => {
      const property = 'properties' in result ? result.properties?.[key] : undefined
      row.push(formatPropertyValue(property))
    })

    table.push(row)
  })

  return table.toString()
}

function convertToCSV(results: NotionResult[]): string {
  if (results.length === 0) return ''

  // Get all unique property keys
  const allKeys = new Set<string>()
  for (const result of results) {
    if ('properties' in result && result.properties) {
      for (const key of Object.keys(result.properties)) {
        allKeys.add(key)
      }
    }
  }

  const headers = ['ID', 'Created', 'Last Edited', ...Array.from(allKeys)]
  const csvRows = [headers.join(',')]

  results.forEach((result) => {
    const row = [
      `"${result.id || ''}"`,
      `"${'created_time' in result ? formatDate(result.created_time) : ''}"`,
      `"${'last_edited_time' in result ? formatDate(result.last_edited_time) : ''}"`,
    ]

    // Add property values
    Array.from(allKeys).forEach((key) => {
      const property = 'properties' in result ? result.properties?.[key] : undefined
      const value = formatPropertyValue(property)
      row.push(`"${value.replace(/"/g, '""')}"`)
    })

    csvRows.push(row.join(','))
  })

  return csvRows.join('\n')
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString()
}

function formatPropertyValue(property: unknown): string {
  if (!property || typeof property !== 'object') return ''

  const prop = property as Record<string, unknown>

  switch (prop.type) {
    case 'title':
      return Array.isArray(prop.title) ? prop.title.map((t: any) => t.plain_text).join('') : ''
    case 'rich_text':
      return Array.isArray(prop.rich_text)
        ? prop.rich_text.map((t: any) => t.plain_text).join('')
        : ''
    case 'number':
      return prop.number?.toString() || ''
    case 'select':
      return (prop.select as any)?.name || ''
    case 'multi_select':
      return Array.isArray(prop.multi_select)
        ? prop.multi_select.map((s: any) => s.name).join(', ')
        : ''
    case 'date':
      return (prop.date as any)?.start || ''
    case 'checkbox':
      return prop.checkbox ? '✓' : '✗'
    case 'url':
      return (prop.url as string) || ''
    case 'email':
      return (prop.email as string) || ''
    case 'phone_number':
      return (prop.phone_number as string) || ''
    case 'created_time':
      return formatDate(prop.created_time as string)
    case 'last_edited_time':
      return formatDate(prop.last_edited_time as string)
    case 'created_by':
      return (prop.created_by as any)?.name || ''
    case 'last_edited_by':
      return (prop.last_edited_by as any)?.name || ''
    case 'files':
      return Array.isArray(prop.files)
        ? prop.files.map((f: any) => f.name || f.external?.url).join(', ')
        : ''
    case 'relation':
      return Array.isArray(prop.relation) ? prop.relation.map((r: any) => r.id).join(', ') : ''
    case 'formula':
      return formatPropertyValue(prop.formula)
    case 'rollup':
      return formatPropertyValue(prop.rollup)
    default:
      return JSON.stringify(property).substring(0, 100)
  }
}
