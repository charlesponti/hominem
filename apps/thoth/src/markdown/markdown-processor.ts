import * as cheerio from 'cheerio'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { detectTask, normalizeWhitespace, taskRegex } from './utils'
import { getDatesFromText } from './time-utils'

interface GetProcessedEntryParams {
  $: ReturnType<typeof cheerio.load>
  elem: ReturnType<ReturnType<typeof cheerio.load>>[0]
  entry: ProcessedMarkdownFileEntry
  section: string | null
  tag: string
}

export interface TextAnalysis {
  entities?: Record<string, any>
  topics?: string[]
  sentiment?: {
    score: number
    label: string
  }
  summary?: string
  keywords?: string[]
}

export interface EntryContent {
  tag: string
  text: string
  section: string | null
  isTask?: boolean
  isComplete?: boolean
  textAnalysis?: TextAnalysis
  subentries?: EntryContent[]
}

export interface ProcessedMarkdownFileEntry {
  content: EntryContent[]
  date: string | undefined
  filename: string
  heading: string
  frontmatter?: Record<string, unknown>
}

export interface ProcessedMarkdownFile {
  entries: ProcessedMarkdownFileEntry[]
}

export class MarkdownProcessor {
  async getChunks(content: string, options?: { chunkSize?: number, chunkOverlap?: number }) {
    const separators = ['#', '##', '###', '####', '#####', '######']
    const chunkSize = options?.chunkSize || 2000
    const chunkOverlap = options?.chunkOverlap || 20
    
    // Split by the separators
    const chunks: string[] = []
    const lines = content.split('\n')
    let currentChunk = ''
    
    for (const line of lines) {
      const isHeading = separators.some(sep => line.trim().startsWith(sep + ' '))
      
      if (isHeading && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = line + '\n'
      } else {
        currentChunk += line + '\n'
        
        // Check if current chunk exceeds the chunk size
        if (currentChunk.length >= chunkSize) {
          chunks.push(currentChunk)
          // Keep some overlap for context
          const chunkLines = currentChunk.split('\n')
          const overlapLines = chunkLines.slice(Math.max(0, chunkLines.length - chunkOverlap))
          currentChunk = overlapLines.join('\n')
        }
      }
    }
    
    // Add the last chunk if not empty
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }

  processFrontmatter(content: string): { content: string; frontmatter?: Record<string, unknown> } {
    // Find the frontmatter content at the start of the file
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
    let frontmatter: Record<string, unknown> | undefined
    let processableContent = content

    if (frontmatterMatch) {
      try {
        // Parse the frontmatter content (assuming YAML format)
        const frontmatterContent = frontmatterMatch[1]
        // For now, we'll do a simple key-value extraction
        frontmatter = Object.fromEntries(
          frontmatterContent
            .split('\n')
            .filter((line) => line.includes(':'))
            .map((line) => {
              const [key, ...valueParts] = line.split(':')
              const value = valueParts.join(':').trim()
              // Remove quotes if present
              return [key.trim(), value.replace(/^['"]|['"]$/g, '')]
            })
        )
        // Remove the frontmatter from the content
        processableContent = content.slice(frontmatterMatch[0].length)
      } catch (error) {
        console.warn('Failed to parse frontmatter:', error)
      }
    }

    return { content: processableContent, frontmatter }
  }

  async convertMarkdownToHTML(content: string) {
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(content)

    return cheerio.load(String(file))
  }

  convertMarkdownToAST(content: string) {
    const processor = unified().use(remarkParse)
    return processor.parse(content)
  }

  // Helper method to create or retrieve an entry
  private ensureEntry(
    filename: string,
    heading: string | undefined,
    frontmatter?: Record<string, unknown>,
    entries: ProcessedMarkdownFileEntry[] = []
  ): ProcessedMarkdownFileEntry {
    // If no entry exists or we're at a new heading, create a new entry
    const entry: ProcessedMarkdownFileEntry = {
      date: undefined,
      filename,
      heading: heading || filename.split('/').pop() || '',
      content: [],
      frontmatter,
    }

    entries.push(entry)
    return entry
  }

  async convertMarkdownToJSON(
    markdownContent: string,
    filename: string
  ): Promise<{ result: ProcessedMarkdownFile; html: string }> {
    const result: ProcessedMarkdownFile = { entries: [] }

    // Extract frontmatter if present
    const { content: processableContent, frontmatter } = this.processFrontmatter(markdownContent)

    // Convert markdown to HTML for fancy querying
    const $ = await this.convertMarkdownToHTML(processableContent)

    let currentHeading: string | undefined
    let currentEntry: ProcessedMarkdownFileEntry | null = null

    const elements = $('body').children().toArray()
    for (const elem of elements) {
      const tag = elem.tagName.toLowerCase()
      const text = $(elem).text().trim()
      if (!text) continue

      const { taskText } = detectTask(text)

      const processedText =
        taskText ||
        text
          .replace(/^(-|\*)\s+/, '')
          .replace(taskRegex, '')
          .trim()

      if (/^h[1-6]$/.test(tag)) {
        // New entry on headings
        currentHeading = text
        currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
        const { dates, fullDate } = getDatesFromText(text)
        currentEntry.date = dates.length > 0 ? dates[0].start.split('T')[0] : fullDate
      }

      if (tag === 'p') {
        const previousContent = this.getPreviousEntry(currentEntry)

        if (previousContent && previousContent.tag === 'p') {
          // Add to previous paragraph
          previousContent.text += `\n ${processedText}`
        }

        continue
      }

      if (!currentEntry) {
        currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
      }

      if (tag === 'ul' || tag === 'ol') {
        const listItems = $(elem).find('> li').toArray()
        for (const li of listItems) {
          await this.processListItem({
            $,
            elem: li,
            entry: currentEntry,
            section: currentHeading ? currentHeading.toLowerCase() : null,
            tag,
          })
        }

        continue
      }

      const processedContent = await this.getProcessedEntry({
        $,
        elem,
        entry: currentEntry,
        section: currentHeading ? currentHeading.toLowerCase() : null,
        tag,
      })
      if (processedContent) {
        currentEntry.content.push(processedContent)
      }
    }

    if (result.entries.length === 0 && frontmatter) {
      this.ensureEntry(filename, undefined, frontmatter, result.entries)
    }

    return { result, html: $.html() }
  }

  async getProcessedEntry(params: GetProcessedEntryParams): Promise<EntryContent | undefined> {
    const { $, elem, section, tag } = params
    const text = $(elem).contents().first().text().trim()
    if (!text) return
    const normalizedText = normalizeWhitespace(text)
    const { isTask, isComplete, taskText } = detectTask(normalizedText)

    return {
      tag,
      text: taskText || normalizedText,
      section,
      isTask,
      isComplete,
      subentries: [],
    }
  }

  async processListItem(params: GetProcessedEntryParams) {
    const { $, elem, entry } = params
    const processedContent = await this.getProcessedEntry(params)
    if (!processedContent) return

    entry.content.push(processedContent)

    // Refactored nested lists recursion
    const subentries = await this.processNestedLists($, elem, entry, processedContent.tag)
    if (subentries.length > 0) {
      processedContent.subentries = subentries
    }
  }

  private async processNestedLists(
    $: ReturnType<typeof cheerio.load>,
    liElem: ReturnType<ReturnType<typeof cheerio.load>>[0],
    entry: ProcessedMarkdownFileEntry,
    tag: string
  ): Promise<EntryContent[]> {
    const subentries: EntryContent[] = []

    // Process immediate nested lists (ul or ol) inside the current li element
    const nestedLists = $(liElem).find('> ul, > ol').toArray()
    for (const nestedList of nestedLists) {
      // Use the text of the current li as section
      const parentText = $(liElem).contents().first().text().trim()
      const nestedListItems = $(nestedList).find('> li').toArray()
      for (const nestedListItem of nestedListItems) {
        const nestedContent = await this.getProcessedEntry({
          $,
          elem: nestedListItem,
          entry,
          section: parentText,
          tag,
        })
        if (nestedContent) {
          // Process deeper nested lists recursively
          nestedContent.subentries = await this.processNestedLists($, nestedListItem, entry, tag)
          subentries.push(nestedContent)
        }
      }
    }
    return subentries
  }

  getPreviousEntry(entry: ProcessedMarkdownFileEntry | null): EntryContent | undefined {
    if (!entry) return undefined
    return entry.content[entry.content.length - 1]
  }
}