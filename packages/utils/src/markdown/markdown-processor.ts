import { getDatesFromText } from '@/time'
import * as cheerio from 'cheerio'
import {
  MarkdownTextSplitter,
  type RecursiveCharacterTextSplitterParams,
} from 'langchain/text_splitter'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import type { TextAnalysis } from '../schemas'
import { extractMetadata, type Metadata } from './metadata.schema'
import { detectTask, normalizeWhitespace, taskRegex } from './utils'

export interface EntryContent {
  tag: string
  text: string
  section: string | null
  isTask?: boolean
  isComplete?: boolean
  textAnalysis?: TextAnalysis
  subentries?: EntryContent[]
}

interface GetProcessedEntryParams {
  $: ReturnType<typeof import('cheerio').load>
  elem: ReturnType<ReturnType<typeof import('cheerio').load>>[0]
  entry: {
    content: EntryContent[]
    date?: string
    filename: string
    heading: string
  }
  section: string | null
}

export interface ProcessedMarkdownFileEntry {
  content: EntryContent[]
  date?: string
  filename: string
  heading: string
  metadata?: Metadata
  frontmatter?: Record<string, unknown>
}

export interface ProcessedMarkdownFile {
  entries: ProcessedMarkdownFileEntry[]
  metadata?: Metadata
}

export class MarkdownProcessor {
  async getChunks(content: string, options?: Partial<RecursiveCharacterTextSplitterParams>) {
    const splitter = MarkdownTextSplitter.fromLanguage('markdown', {
      separators: ['#', '##', '###', '####', '#####', '######'],
      ...options,
    })
    const chunks = await splitter.splitText(content)
    return chunks
  }

  async processFileWithAst(content: string, filename: string): Promise<ProcessedMarkdownFile> {
    const { result } = await this.convertMarkdownToJSON(content, filename)

    return result
  }

  processFrontmatter(content: string): {
    content: string
    metadata: Metadata
    frontmatter?: Record<string, unknown>
  } {
    // Find the frontmatter content at the start of the file
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
    let frontmatter: Record<string, unknown> | undefined
    let processableContent = content
    let metadata: Metadata = {}

    if (frontmatterMatch) {
      // Parse the frontmatter content (assuming YAML format)
      const frontmatterContent = frontmatterMatch[1]

      if (!frontmatterContent) {
        return { content, metadata, frontmatter: undefined }
      }

      // Extract key-value pairs
      frontmatter = Object.fromEntries(
        frontmatterContent
          .split('\n')
          .filter((line) => line.includes(':'))
          .map((line) => {
            const [key, ...valueParts] = line.split(':')
            const value = valueParts.join(':').trim()
            if (!key) return [value]
            return [key.trim(), value.replace(/^['"]|['"]$/g, '')]
          })
      )

      // Validate and extract metadata
      if (frontmatter) {
        metadata = extractMetadata(frontmatter)
      }

      // Remove the frontmatter from the content
      processableContent = content.slice(frontmatterMatch[0].length)
    }

    return { content: processableContent, metadata, frontmatter }
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
    heading?: string,
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

  private async calculateReadingMetrics(
    content: string
  ): Promise<{ wordCount: number; readingTime: number }> {
    const words = content.trim().split(/\s+/).length
    // Average reading speed: 200-250 words per minute
    const readingTime = Math.ceil(words / 200)

    return { wordCount: words, readingTime }
  }

  async convertMarkdownToJSON(
    markdownContent: string,
    filename: string
  ): Promise<{ result: ProcessedMarkdownFile; html: string }> {
    // Process frontmatter and extract metadata
    const {
      content: processableContent,
      metadata,
      frontmatter,
    } = this.processFrontmatter(markdownContent)

    // Calculate reading metrics
    const { wordCount, readingTime } = await this.calculateReadingMetrics(processableContent)
    metadata.wordCount = wordCount
    metadata.readingTime = readingTime

    // Convert markdown to HTML for processing
    const $ = await this.convertMarkdownToHTML(processableContent)

    const result: ProcessedMarkdownFile = {
      entries: [],
      metadata,
    }

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
        currentHeading = text
        // New entry on headings
        currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
        const { dates, fullDate } = getDatesFromText(text)
        if (dates.length > 0 && dates[0]) {
          currentEntry.date = dates[0].start.split('T')[0]
        } else if (fullDate) {
          currentEntry.date = fullDate.split('T')[0]
        }
      }

      if (tag === 'paragraph') {
        const previousContent = this.getPreviousEntry(currentEntry)

        // If the previous entry was a paragraph, add to previous paragraph
        if (previousContent && previousContent.tag === 'paragraph') {
          previousContent.text += `\n ${processedText}`
        }

        continue
      }

      if (!currentEntry) {
        currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
      }

      const processedContent = await this.getProcessedEntry({
        $,
        elem,
        entry: currentEntry,
        section: currentHeading ? currentHeading.toLowerCase() : null,
      })

      if (processedContent) {
        currentEntry.content.push(processedContent)
      }

      if (tag === 'ul' || tag === 'ol') {
        const listItems = $(elem).find('> li').toArray()

        for (const li of listItems) {
          const processedContent = await this.getProcessedEntry({
            $,
            elem: li,
            entry: currentEntry,
            section: currentHeading ? currentHeading.toLowerCase() : null,
          })
          if (!processedContent) {
            console.error('No processed content found for list item', tag, processedText)
            continue
          }

          currentEntry.content.push(processedContent)

          processedContent.subentries = await this.processNestedLists(
            $,
            li,
            currentEntry,
            processedContent.tag
          )
        }
      }
    }

    if (result.entries.length === 0 && frontmatter) {
      this.ensureEntry(filename, undefined, frontmatter, result.entries)
    }

    return { result, html: $.html() }
  }

  async getProcessedEntry(params: GetProcessedEntryParams): Promise<EntryContent | undefined> {
    const { $, elem, section } = params
    const text = $(elem).contents().first().text().trim()
    if (!text) return
    const normalizedText = normalizeWhitespace(text)
    const { isTask, isComplete, taskText } = detectTask(normalizedText)

    return {
      tag: elem.type,
      text: taskText || normalizedText,
      section,
      isTask,
      isComplete,
      subentries: [],
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
