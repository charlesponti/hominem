import { Client } from '@notionhq/client'
import chalk from 'chalk'
import { Command } from 'commander'
import { z } from 'zod'
import { trpc } from '../../lib/trpc'
import { getValidAccessToken } from '../../utils/auth-utils'

const NotionConfigSchema = z.object({
  NOTION_TOKEN: z.string().min(1, 'Notion integration token is required'),
  NOTION_DATABASE_ID: z.string().min(1, 'Notion database ID is required'),
})

const SyncOptionsSchema = z.object({
  limit: z.number().min(1).max(100).default(100),
  startCursor: z.string().optional(),
  filter: z.string().optional(),
  sort: z.string().optional(),
  dryRun: z.boolean().default(false),
  batchSize: z.number().min(1).max(50).default(10),
  contentType: z.enum(['note', 'task', 'document']).default('note'),
  tagPrefix: z.string().default('notion'),
})

type SyncOptions = z.infer<typeof SyncOptionsSchema>

interface NotionResult {
  id: string
  created_time?: string
  last_edited_time?: string
  properties?: Record<string, unknown>
}

export const syncCommand = new Command('sync')
  .description('Sync Notion database data with hominem API')
  .option('-l, --limit <number>', 'Maximum number of results to fetch (1-100)', '100')
  .option('-c, --cursor <string>', 'Pagination cursor for next page')
  .option('-f, --filter <string>', 'Filter query (JSON string)')
  .option('-s, --sort <string>', 'Sort query (JSON string)')
  .option('--dry-run', 'Show what would be synced without actually syncing', false)
  .option('--batch-size <number>', 'Number of items to process in each batch (1-50)', '10')
  .option('--content-type <type>', 'Content type to create: note, task, document', 'note')
  .option('--tag-prefix <prefix>', 'Prefix for auto-generated tags', 'notion')
  .action(async (options) => {
    try {
      // Check authentication
      const token = await getValidAccessToken()
      if (!token) {
        // eslint-disable-next-line no-console
        console.error(chalk.red('❌ Authentication required. Please run `hominem auth` first.'))
        process.exit(1)
      }

      // Validate environment variables
      const config = NotionConfigSchema.parse({
        NOTION_TOKEN: process.env.NOTION_TOKEN,
        NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
      })

      // Validate and parse options
      const syncOptions = SyncOptionsSchema.parse({
        limit: Number.parseInt(options.limit, 10),
        startCursor: options.cursor,
        filter: options.filter ? JSON.parse(options.filter) : undefined,
        sort: options.sort ? JSON.parse(options.sort) : undefined,
        dryRun: options.dryRun,
        batchSize: Number.parseInt(options.batchSize, 10),
        contentType: options.contentType,
        tagPrefix: options.tagPrefix,
      })

      // Initialize Notion client
      const notion = new Client({
        auth: config.NOTION_TOKEN,
      })

      // Query the database
      const response = await notion.databases.query({
        database_id: config.NOTION_DATABASE_ID,
        page_size: syncOptions.limit,
        start_cursor: syncOptions.startCursor,
        filter: syncOptions.filter as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        sorts: syncOptions.sort as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })

      const results = response.results as NotionResult[]
      const hasMore = response.has_more
      const _nextCursor = response.next_cursor
      if (hasMore) {
      }

      if (results.length === 0) {
        return
      }

      // Process and sync results
      await syncResults(results, syncOptions)
    } catch (error) {
      if (error instanceof z.ZodError) {
        // eslint-disable-next-line no-console
        console.error(chalk.red('❌ Configuration error:'))
        error.errors.forEach((err) => {
          // eslint-disable-next-line no-console
          console.error(chalk.red(`  - ${err.path.join('.')}: ${err.message}`))
        })
        // eslint-disable-next-line no-console
        console.error(
          chalk.yellow(
            '\n💡 Make sure to set NOTION_TOKEN and NOTION_DATABASE_ID environment variables'
          )
        )
        // eslint-disable-next-line no-console
        console.error(chalk.yellow('   You can create a .env file or export them in your shell'))
      } else {
        // eslint-disable-next-line no-console
        console.error(chalk.red('❌ Error syncing data:'), error)
      }
      process.exit(1)
    }
  })

async function syncResults(results: NotionResult[], options: SyncOptions) {
  if (options.dryRun) {
  }

  let _syncedCount = 0
  let errorCount = 0
  const errors: string[] = []

  // Process results in batches
  for (let i = 0; i < results.length; i += options.batchSize) {
    const batch = results.slice(i, i + options.batchSize)

    for (const result of batch) {
      try {
        const contentData = await convertNotionToContent(result, options)

        if (options.dryRun) {
        } else {
          await trpc.content.create.mutate(contentData)
        }

        _syncedCount++
      } catch (error) {
        errorCount++
        const errorMsg = `Failed to sync ${result.id}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        // eslint-disable-next-line no-console
        console.error(chalk.red(`  ❌ ${errorMsg}`))
      }
    }

    // Add a small delay between batches to avoid rate limiting
    if (i + options.batchSize < results.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  if (options.dryRun) {
  } else {
  }

  if (errorCount > 0) {
    errors.forEach((_error) => {})
  }
}

async function convertNotionToContent(result: NotionResult, options: SyncOptions) {
  // Extract title from properties
  const title = extractTitle(result.properties)

  // Extract content from properties
  const content = extractContent(result.properties)

  // Generate tags
  const tags = generateTags(result, options.tagPrefix)

  // Determine content type and metadata
  let contentType = options.contentType
  let taskMetadata: ReturnType<typeof extractTaskMetadata> | undefined

  // Check if this should be a task based on properties
  if (hasTaskProperties(result.properties)) {
    contentType = 'task'
    taskMetadata = extractTaskMetadata(result.properties)
  }

  return {
    type: contentType,
    title: title || 'Untitled',
    content: content || '',
    tags: tags,
    mentions: [],
    taskMetadata,
  }
}

function extractTitle(properties?: Record<string, unknown>): string | undefined {
  if (!properties) return undefined

  // Look for common title properties
  const titleKeys = ['Name', 'Title', 'Page', 'Task', 'Note']

  for (const key of titleKeys) {
    const property = properties[key]
    if (property && typeof property === 'object' && 'type' in property) {
      const prop = property as Record<string, unknown>
      if (prop.type === 'title' && Array.isArray(prop.title)) {
        return prop.title.map((t: { plain_text: string }) => t.plain_text).join('')
      }
    }
  }

  return undefined
}

function extractContent(properties?: Record<string, unknown>): string {
  if (!properties) return ''

  const contentParts: string[] = []

  // Extract content from various property types
  Object.entries(properties).forEach(([key, property]) => {
    if (property && typeof property === 'object' && 'type' in property) {
      const prop = property as Record<string, unknown>
      let value = ''

      switch (prop.type) {
        case 'rich_text':
          if (Array.isArray(prop.rich_text)) {
            value = prop.rich_text.map((t: { plain_text: string }) => t.plain_text).join('')
          }
          break
        case 'select':
          value = (prop.select as { name: string })?.name || ''
          break
        case 'multi_select':
          if (Array.isArray(prop.multi_select)) {
            value = prop.multi_select.map((s: { name: string }) => s.name).join(', ')
          }
          break
        case 'number':
          value = prop.number?.toString() || ''
          break
        case 'date':
          value = (prop.date as { start: string })?.start || ''
          break
        case 'checkbox':
          value = prop.checkbox ? 'Yes' : 'No'
          break
        case 'url':
          value = (prop.url as string) || ''
          break
        case 'email':
          value = (prop.email as string) || ''
          break
        case 'phone_number':
          value = (prop.phone_number as string) || ''
          break
      }

      if (value && !isTitleProperty(key)) {
        contentParts.push(`**${key}**: ${value}`)
      }
    }
  })

  return contentParts.join('\n\n')
}

function isTitleProperty(key: string): boolean {
  const titleKeys = ['Name', 'Title', 'Page', 'Task', 'Note']
  return titleKeys.includes(key)
}

function hasTaskProperties(properties?: Record<string, unknown>): boolean {
  if (!properties) return false

  // Check for common task-related properties
  const taskKeys = ['Status', 'Priority', 'Due Date', 'Assignee', 'Progress', 'Done']
  return taskKeys.some((key) => properties[key] !== undefined)
}

function extractTaskMetadata(properties?: Record<string, unknown>) {
  if (!properties) return undefined

  const metadata: any = {
    status: 'todo',
    priority: 'medium',
  }

  // Extract status
  const statusProperty = properties.Status
  if (statusProperty && typeof statusProperty === 'object' && 'type' in statusProperty) {
    const prop = statusProperty as Record<string, unknown>
    if (prop.type === 'select') {
      const statusValue = (prop.select as { name: string })?.name?.toLowerCase()
      if (statusValue) {
        if (statusValue.includes('done') || statusValue.includes('complete')) {
          metadata.status = 'done'
        } else if (statusValue.includes('progress') || statusValue.includes('working')) {
          metadata.status = 'in-progress'
        }
      }
    }
  }

  // Extract priority
  const priorityProperty = properties.Priority
  if (priorityProperty && typeof priorityProperty === 'object' && 'type' in priorityProperty) {
    const prop = priorityProperty as Record<string, unknown>
    if (prop.type === 'select') {
      const priorityValue = (prop.select as { name: string })?.name?.toLowerCase()
      if (priorityValue) {
        if (priorityValue.includes('high') || priorityValue.includes('urgent')) {
          metadata.priority = 'high'
        } else if (priorityValue.includes('low')) {
          metadata.priority = 'low'
        }
      }
    }
  }

  // Extract due date
  const dueDateProperty = properties['Due Date']
  if (dueDateProperty && typeof dueDateProperty === 'object' && 'type' in dueDateProperty) {
    const prop = dueDateProperty as Record<string, unknown>
    if (prop.type === 'date') {
      metadata.dueDate = (prop.date as { start: string })?.start || null
    }
  }

  return metadata
}

function generateTags(result: NotionResult, prefix: string) {
  const tags = [{ value: prefix }, { value: 'notion-sync' }]

  // Add tags based on content type
  if (result.created_time) {
    const date = new Date(result.created_time)
    const year = date.getFullYear()
    const month = date.toLocaleString('default', { month: 'long' })
    tags.push({ value: `${year}` })
    tags.push({ value: month })
  }

  return tags
}
