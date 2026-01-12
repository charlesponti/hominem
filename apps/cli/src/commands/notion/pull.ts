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

// === Notion filter/sort schemas ===
// Property-level text-like filters
const TextFilterSchema = z.object({
  contains: z.string().optional(),
  does_not_contain: z.string().optional(),
  equals: z.string().optional(),
  is_empty: z.boolean().optional(),
  is_not_empty: z.boolean().optional(),
  starts_with: z.string().optional(),
  ends_with: z.string().optional(),
})

const NumberFilterSchema = z.object({
  equals: z.number().optional(),
  does_not_equal: z.number().optional(),
  greater_than: z.number().optional(),
  less_than: z.number().optional(),
  greater_than_or_equal_to: z.number().optional(),
  less_than_or_equal_to: z.number().optional(),
  is_empty: z.boolean().optional(),
  is_not_empty: z.boolean().optional(),
})

const SelectFilterSchema = z.object({
  equals: z.string().optional(),
  does_not_equal: z.string().optional(),
  is_empty: z.boolean().optional(),
  is_not_empty: z.boolean().optional(),
})

const DateFilterSchema = z.object({
  equals: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  on_or_before: z.string().optional(),
  on_or_after: z.string().optional(),
  is_empty: z.boolean().optional(),
  is_not_empty: z.boolean().optional(),
})

const CheckboxFilterSchema = z.object({ equals: z.boolean() })

const PropertyTitleFilter = z.object({ property: z.string(), title: TextFilterSchema })
const PropertyRichTextFilter = z.object({ property: z.string(), rich_text: TextFilterSchema })
const PropertyNumberFilter = z.object({ property: z.string(), number: NumberFilterSchema })
const PropertySelectFilter = z.object({ property: z.string(), select: SelectFilterSchema })
const PropertyMultiSelectFilter = z.object({ property: z.string(), multi_select: SelectFilterSchema })
const PropertyDateFilter = z.object({ property: z.string(), date: DateFilterSchema })
const PropertyCheckboxFilter = z.object({ property: z.string(), checkbox: CheckboxFilterSchema })
const PropertyCreatedTimeFilter = z.object({ property: z.string(), created_time: DateFilterSchema })
const PropertyLastEditedTimeFilter = z.object({ property: z.string(), last_edited_time: DateFilterSchema })
const PropertyFormulaFilter = z.object({ property: z.string(), formula: z.union([TextFilterSchema, NumberFilterSchema, z.object({})]).optional() })

// Recursive filter that supports compound filters and property filters
const FilterSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({ and: z.array(FilterSchema) }),
    z.object({ or: z.array(FilterSchema) }),
    z.object({ not: FilterSchema }),
    PropertyTitleFilter,
    PropertyRichTextFilter,
    PropertyNumberFilter,
    PropertySelectFilter,
    PropertyMultiSelectFilter,
    PropertyDateFilter,
    PropertyCheckboxFilter,
    PropertyCreatedTimeFilter,
    PropertyLastEditedTimeFilter,
    PropertyFormulaFilter,
  ])
)

const SortItemSchema = z.union([
  z.object({ property: z.string(), direction: z.enum(['ascending', 'descending']) }),
  z.object({ timestamp: z.enum(['created_time', 'last_edited_time']), direction: z.enum(['ascending', 'descending']) }),
])

const SortSchema = z.array(SortItemSchema)

const QueryOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(100),
  startCursor: z.string().optional(),
  filter: FilterSchema.optional(),
  sort: SortSchema.optional(),
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

      // Parse filter and sort options with error handling
      // Use strict zod-inferred types for filter and sort
      let filter: z.infer<typeof FilterSchema> | undefined
      let sort: z.infer<typeof SortSchema> | undefined

      try {
        filter = options.filter ? JSON.parse(options.filter) : undefined
      } catch (error) {
        throw new Error(`Invalid filter JSON: ${error}`)
      }

      try {
        sort = options.sort ? JSON.parse(options.sort) : undefined
      } catch (error) {
        throw new Error(`Invalid sort JSON: ${error}`)
      }

      // Validate and parse options
      const queryOptions = QueryOptionsSchema.parse({
        limit: Number.parseInt(options.limit, 10),
        startCursor: options.cursor,
        filter,
        sort,
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
        filter: queryOptions.filter,
        sorts: queryOptions.sort,
      })

      const results = response.results
      const hasMore = response.has_more
      const nextCursor = response.next_cursor

      if (hasMore) {
        console.log(
          chalk.yellow(
            `⚠️  Only showing first ${queryOptions.limit} results. Use --cursor "${nextCursor}" to fetch more.`
          )
        )
      }

      // Process and display results
      if (results.length === 0) {
        console.log(chalk.yellow('No results found.'))
        return
      }

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
    console.log(chalk.green(`✅ Results written to ${options.outputFile}`))
  } else {
    console.log(output)
  }
}

function getAllPropertyKeys(results: NotionResult[]): string[] {
  const allKeys = new Set<string>()
  for (const result of results) {
    if (result.properties) {
      for (const key of Object.keys(result.properties)) {
        allKeys.add(key)
      }
    }
  }
  return Array.from(allKeys)
}

function convertToTable(results: NotionResult[]) {
  if (results.length === 0) {
    return ''
  }

  const allKeys = getAllPropertyKeys(results)
  const headers = ['ID', 'Created', 'Last Edited', ...allKeys]

  // Calculate dynamic column widths based on content
  const colWidths = headers.map((header, index) => {
    if (index < 3) {
      // Fixed widths for ID, Created, Last Edited
      return [20, 20, 20][index]
    }
    // Dynamic width for property columns (min 10, max 50)
    const maxContentLength = Math.max(
      header.length,
      ...results.map((result) => {
        const property = result.properties?.[header]
        return formatPropertyValue(property).length
      })
    )
    return Math.min(Math.max(maxContentLength + 2, 10), 50)
  })

  const table = new Table({
    head: headers,
    colWidths,
  })

  results.forEach((result) => {
    const row = [
      result.id || '',
      result.created_time ? formatDate(result.created_time) : '',
      result.last_edited_time ? formatDate(result.last_edited_time) : '',
    ]

    // Add property values
    allKeys.forEach((key) => {
      const property = result.properties?.[key]
      row.push(formatPropertyValue(property))
    })

    table.push(row)
  })

  return table.toString()
}

function convertToCSV(results: NotionResult[]) {
  if (results.length === 0) {
    return ''
  }

  const allKeys = getAllPropertyKeys(results)
  const headers = ['ID', 'Created', 'Last Edited', ...allKeys]
  const csvRows = [headers.map(escapeCSV).join(',')]

  results.forEach((result) => {
    const row = [
      escapeCSV(result.id || ''),
      escapeCSV(result.created_time ? formatDate(result.created_time) : ''),
      escapeCSV(result.last_edited_time ? formatDate(result.last_edited_time) : ''),
    ]

    // Add property values
    allKeys.forEach((key) => {
      const property = result.properties?.[key]
      const value = formatPropertyValue(property)
      row.push(escapeCSV(value))
    })

    csvRows.push(row.join(','))
  })

  return csvRows.join('\n')
}

function escapeCSV(value: string): string {
  // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
  const escaped = value.replace(/"/g, '""')
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`
  }
  return escaped
}

// Type definitions for Notion properties
interface NotionTitle {
  type: 'title'
  title: Array<{ plain_text: string }>
}

interface NotionRichText {
  type: 'rich_text'
  rich_text: Array<{ plain_text: string }>
}

interface NotionNumber {
  type: 'number'
  number: number | null
}

interface NotionSelect {
  type: 'select'
  select: { name: string } | null
}

interface NotionMultiSelect {
  type: 'multi_select'
  multi_select: Array<{ name: string }>
}

interface NotionDate {
  type: 'date'
  date: { start: string; end?: string } | null
}

interface NotionCheckbox {
  type: 'checkbox'
  checkbox: boolean
}

interface NotionUrl {
  type: 'url'
  url: string | null
}

interface NotionEmail {
  type: 'email'
  email: string | null
}

interface NotionPhoneNumber {
  type: 'phone_number'
  phone_number: string | null
}

interface NotionCreatedTime {
  type: 'created_time'
  created_time: string
}

interface NotionLastEditedTime {
  type: 'last_edited_time'
  last_edited_time: string
}

interface NotionCreatedBy {
  type: 'created_by'
  created_by: { name: string }
}

interface NotionLastEditedBy {
  type: 'last_edited_by'
  last_edited_by: { name: string }
}

interface NotionFiles {
  type: 'files'
  files: Array<{ name?: string; external?: { url: string } }>
}

interface NotionRelation {
  type: 'relation'
  relation: Array<{ id: string }>
}

interface NotionFormula {
  type: 'formula'
  formula: unknown
}

interface NotionRollup {
  type: 'rollup'
  rollup: unknown
}

type NotionProperty =
  | NotionTitle
  | NotionRichText
  | NotionNumber
  | NotionSelect
  | NotionMultiSelect
  | NotionDate
  | NotionCheckbox
  | NotionUrl
  | NotionEmail
  | NotionPhoneNumber
  | NotionCreatedTime
  | NotionLastEditedTime
  | NotionCreatedBy
  | NotionLastEditedBy
  | NotionFiles
  | NotionRelation
  | NotionFormula
  | NotionRollup

function formatDate(dateString: string): string {
  if (!dateString) {
    return ''
  }
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleString()
  } catch {
    return 'Invalid Date'
  }
}

function formatPropertyValue(property: unknown): string {
  if (!property || typeof property !== 'object') {
    return ''
  }

  const prop = property as NotionProperty

  switch (prop.type) {
    case 'title':
      return Array.isArray(prop.title) ? prop.title.map((t) => t.plain_text).join('') : ''
    case 'rich_text':
      return Array.isArray(prop.rich_text) ? prop.rich_text.map((t) => t.plain_text).join('') : ''
    case 'number':
      return prop.number?.toString() ?? ''
    case 'select':
      return prop.select?.name ?? ''
    case 'multi_select':
      return Array.isArray(prop.multi_select) ? prop.multi_select.map((s) => s.name).join(', ') : ''
    case 'date':
      return prop.date?.start ?? ''
    case 'checkbox':
      return prop.checkbox ? '✓' : '✗'
    case 'url':
      return prop.url ?? ''
    case 'email':
      return prop.email ?? ''
    case 'phone_number':
      return prop.phone_number ?? ''
    case 'created_time':
      return formatDate(prop.created_time)
    case 'last_edited_time':
      return formatDate(prop.last_edited_time)
    case 'created_by':
      return prop.created_by.name
    case 'last_edited_by':
      return prop.last_edited_by.name
    case 'files':
      return Array.isArray(prop.files)
        ? prop.files.map((f) => f.name || f.external?.url).join(', ')
        : ''
    case 'relation':
      return Array.isArray(prop.relation) ? prop.relation.map((r) => r.id).join(', ') : ''
    case 'formula':
      return formatPropertyValue(prop.formula)
    case 'rollup':
      return formatPropertyValue(prop.rollup)
    default:
      return JSON.stringify(property).substring(0, 100)
  }
}
