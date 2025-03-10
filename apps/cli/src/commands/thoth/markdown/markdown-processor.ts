import { logger } from '@ponti/utils/logger'
import { NLPProcessor, type TextAnalysis, type TextAnalysisEmotion } from '@ponti/utils/nlp'
import { getDatesFromText } from '@ponti/utils/time'
import nlp from 'compromise'
import * as mdast from 'mdast-util-to-string'
import * as fs from 'node:fs/promises'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Node } from 'unist'
import type { ProcessedContent } from './types'
import { detectTask, getContentType, normalizeWhitespace } from './utils'

// Define the structure for our resulting JSON
export interface ProcessedMarkdownFileEntry {
  content: EntryContent[]
  date: string | undefined
  filename: string
  heading: string
  frontmatter?: Record<string, unknown>
}

export interface EntryContent {
  tag: string
  type: string
  text: string
  section: string | null
  subItems?: EntryContent[]
  isComplete?: boolean
  metadata?: {
    location?: string
    people?: string[]
    tags?: string[]
  }
  textAnalysis?: TextAnalysis
}

export interface ProcessedMarkdownFile {
  entries: ProcessedMarkdownFileEntry[]
}

export interface MarkdownNode extends Node {
  type: string
  children?: MarkdownNode[]
  value?: string
  depth?: number
}

export class MarkdownProcessor {
  private currentHeading: string | undefined
  private content: ProcessedContent

  constructor() {
    this.content = {
      headings: [],
      paragraphs: [],
      bulletPoints: [],
      others: [],
    }
  }

  async processFileWithAst(filepath: string): Promise<ProcessedMarkdownFile> {
    // Check that the file exists
    if (!(await fs.stat(filepath)).isFile()) {
      throw new Error(`File not found: ${filepath}`)
    }

    const content = await fs.readFile(filepath, 'utf-8')
    return this.convertMarkdownToJSON(content, filepath)
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
        logger.warn('Failed to parse frontmatter:', error)
      }
    }

    return { content: processableContent, frontmatter }
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
  ): Promise<ProcessedMarkdownFile> {
    const result: ProcessedMarkdownFile = {
      entries: [],
    }

    // Extract frontmatter if present
    const { content: processableContent, frontmatter } = this.processFrontmatter(markdownContent)

    // Convert the markdown content to an AST
    const ast = this.convertMarkdownToAST(processableContent)

    let currentEntry: ProcessedMarkdownFileEntry | null = null
    let currentHeading: string | undefined

    const processListItem = async (item: MarkdownNode): Promise<EntryContent | null> => {
      const itemText = mdast.toString(item)
      if (!itemText.trim()) return null

      // Find the direct text content of this list item (excluding sublists)
      const directTextNodes =
        item.children?.filter((child) => child.type === 'text' || child.type === 'paragraph') || []

      const directText = directTextNodes
        .map((child) => mdast.toString(child))
        .join(' ')
        .trim()

      if (!directText) return null

      const normalizedText = normalizeWhitespace(directText)
      const { isTask, isComplete, taskText } = detectTask(normalizedText)

      // Create the content entry
      const content: EntryContent = {
        tag: item.type,
        type: isTask ? 'task' : 'thought',
        text: taskText,
        section: currentHeading?.toLowerCase() || null,
        subItems: [],
        ...(isTask && { isComplete }),
      }

      // Process sublists recursively
      const sublists = item.children?.filter((child) => child.type === 'list') || []

      for (const sublist of sublists) {
        const subItems = await Promise.all(
          (sublist.children || [])
            .filter((subItem) => subItem.type === 'listItem')
            .map((subItem) => processListItem(subItem))
        )

        content.subItems?.push(...(subItems.filter(Boolean) as EntryContent[]))
      }

      // Ensure we have an entry to add the content to
      if (!currentEntry) {
        currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
      }

      // Process the content type and sentiment
      await this.processContent({
        tag: item.type,
        text: normalizedText,
        entry: currentEntry,
        section: currentHeading?.toLowerCase() || null,
        content,
      })

      return content
    }

    const processNode = async (node: MarkdownNode) => {
      if (node.type === 'root') {
        // Only process children of root
        if (node.children) {
          for (const child of node.children) {
            await processNode(child)
          }
        }
        return
      }

      const text = mdast.toString(node)
      const normalizedText = normalizeWhitespace(text)

      switch (node.type) {
        case 'heading': {
          currentHeading = normalizedText
          const { dates, fullDate } = getDatesFromText(text)
          const parsedDate = dates.length > 0 ? dates[0].start.split('T')[0] : fullDate

          currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
          currentEntry.date = parsedDate
          break
        }

        case 'list': {
          if (!currentEntry) {
            currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
          }

          const previousNode = this.getPreviousEntry(currentEntry)
          if (node.children) {
            const listItems = await Promise.all(
              node.children
                .filter((item) => item.type === 'listItem')
                .map((item) => processListItem(item))
            )

            currentEntry.content.push(...(listItems.filter(Boolean) as EntryContent[]))
          }
          break
        }

        case 'listItem': {
          if (!currentEntry) {
            currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
          }

          const previousNode = this.getPreviousEntry(currentEntry)

          if (previousNode?.text.endsWith(':')) {
            // Add as sub-item to previous node
            const processedItem = await processListItem(node)
            if (processedItem) {
              previousNode.subItems = previousNode.subItems || []
              previousNode.subItems.push(processedItem)
            }
          } else {
            // Process as standalone entry
            const processedItem = await processListItem(node)

            if (processedItem) {
              currentEntry.content.push(processedItem)
            }
          }
          break
        }

        default: {
          // Skip empty nodes or those matching the heading
          if (!normalizedText.trim() || normalizedText.trim() === currentHeading?.toLowerCase()) {
            break
          }

          if (!currentEntry) {
            currentEntry = this.ensureEntry(filename, currentHeading, frontmatter, result.entries)
          }

          await this.processContent({
            tag: node.type,
            text: normalizedText,
            entry: currentEntry,
            section: currentHeading?.toLowerCase() || null,
          })
          break
        }
      }

      // Process children recursively (except for list and paragraph)
      if (node.children && node.type !== 'list' && node.type !== 'paragraph') {
        for (const child of node.children) {
          await processNode(child)
        }
      }
    }

    // Start processing from root
    await processNode(ast as MarkdownNode)

    // Create default entry if none exists but we have frontmatter
    if (result.entries.length === 0 && frontmatter) {
      this.ensureEntry(filename, undefined, frontmatter, result.entries)
    }

    return result
  }

  // Helper function to process content and categorize it using NLP
  async processContent({
    tag,
    text,
    entry,
    section,
    content,
  }: {
    tag: string
    text: string
    entry: ProcessedMarkdownFileEntry
    section: string | null
    content?: EntryContent
  }): Promise<void> {
    if (!text) return

    // Remove leading dashes from bullet points
    let processedText = text.replace(/^- /, '')

    // Use compromise for basic NLP analysis
    const doc = nlp(text)

    // Check if this is a task item
    const { isTask, isComplete, taskMatch } = detectTask(processedText)
    if (isTask && taskMatch?.[2]) {
      processedText = taskMatch[2]
    }

    const contentType = getContentType(doc, processedText, isTask)

    // Extract metadata with helper method
    const metadata = this.extractMetadata(doc, text)

    // Handle content update
    if (content) {
      if (!isTask) {
        content.type = contentType
      }
      content.section = section
      content.metadata = metadata
      if (isTask) {
        content.isComplete = isComplete
      }
    } else {
      const previousContent = this.getPreviousEntry(entry)

      if (previousContent && previousContent.tag === 'paragraph' && tag === 'paragraph') {
        // Add to previous paragraph
        previousContent.text += `\n ${processedText}`
      } else {
        // Create new content entry
        entry.content.push({
          tag,
          type: contentType,
          text: processedText,
          section,
          metadata,
          ...(isTask && { isComplete }),
        })
      }
    }
  }

  private extractMetadata(doc: ReturnType<typeof nlp>, text: string) {
    const metadata = {
      location: undefined,
      people: [] as string[],
      tags: [] as string[],
    }

    // Extract locations
    const locations = doc.places().out('array')
    if (locations.length > 0) {
      metadata.location = locations[0]
    }

    // Extract people
    const people = doc.people().out('array')
    metadata.people = Array.from(new Set(people))

    // Extract hashtags
    const hashtagMatch = text.match(/#\w+/g)
    if (hashtagMatch) {
      for (const tag of hashtagMatch) {
        const cleanTag = tag.substring(1).toLowerCase()
        metadata.tags.push(cleanTag)
      }
    }

    // Add key concepts as tags
    const topics = doc.topics().out('array')
    for (const topic of topics) {
      const cleanTopic = topic.toLowerCase()
      if (!metadata.tags.includes(cleanTopic)) {
        metadata.tags.push(cleanTopic)
      }
    }

    return metadata
  }

  getPreviousEntry(entry: ProcessedMarkdownFileEntry | null): EntryContent | undefined {
    if (!entry) return undefined
    return entry.content[entry.content.length - 1]
  }
}

export class EnhancedMarkdownProcessor extends MarkdownProcessor {
  private nlpProcessor = new NLPProcessor({
    provider: 'ollama',
    model: 'llama3.2',
  })

  async processContent(params: {
    tag: string
    text: string
    entry: ProcessedMarkdownFileEntry
    section: string | null
    content?: EntryContent
  }): Promise<void> {
    await super.processContent(params)

    // Add NLP analysis to the content object
    if (params.content) {
      const textAnalysis = await this.nlpProcessor.analyzeText(params.text)
      params.content.textAnalysis = textAnalysis
      return
    }

    const previousContent = this.getPreviousEntry(params.entry)
    if (previousContent) {
      const textAnalysis = await this.nlpProcessor.analyzeText(params.text)
      previousContent.textAnalysis = textAnalysis
    }
  }
}
