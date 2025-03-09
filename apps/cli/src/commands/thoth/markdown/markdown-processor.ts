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
        // You might want to add a proper YAML parser like 'js-yaml' for more complex frontmatter
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
      const directText = item.children
        ?.filter((child) => child.type === 'text' || child.type === 'paragraph')
        .map((child) => mdast.toString(child))
        .join(' ')
        .trim()

      if (!directText) return null

      const normalizedText = normalizeWhitespace(directText)

      const { isTask, isComplete, taskText } = detectTask(normalizedText)

      // Create the content entry
      const content: EntryContent = {
        tag: item.type,
        type: isTask ? 'task' : 'thought', // Will be updated by processContent if not a task
        text: taskText,
        section: currentHeading?.toLowerCase() || null,
        subItems: [],
        ...(isTask && { isComplete }),
      }

      // Process sublists if they exist
      const sublists = item.children?.filter((child) => child.type === 'list')
      if (sublists && sublists.length > 0) {
        for (const sublist of sublists) {
          for (const subItem of sublist.children || []) {
            if (subItem.type === 'listItem') {
              const processedSubItem = await processListItem(subItem)
              if (processedSubItem) {
                content.subItems?.push(processedSubItem)
              }
            }
          }
        }
      }

      if (!currentEntry) {
        currentEntry = {
          date: undefined,
          filename,
          heading: filename.split('/').pop() || '',
          content: [],
          frontmatter,
        }

        result.entries.push(currentEntry)
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
      // Skip the root node's direct text content as it might contain frontmatter remnants
      if (node.type === 'root') {
        // Only process children of root, not its direct content
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
          currentHeading = normalizeWhitespace(text)
          const { dates, fullDate } = getDatesFromText(text)
          const parsedDate = dates.length > 0 ? dates[0].start.split('T')[0] : fullDate

          currentEntry = {
            date: parsedDate,
            filename,
            heading: currentHeading,
            content: [],
            frontmatter,
          }
          result.entries.push(currentEntry)
          break
        }

        case 'list': {
          if (node.children) {
            for (const item of node.children) {
              if (item.type === 'listItem') {
                // Ensure we have an entry to add content to
                if (!currentEntry) {
                  currentEntry = {
                    date: undefined,
                    filename,
                    heading: currentHeading || filename.split('/').pop() || '',
                    content: [],
                    frontmatter,
                  }
                  result.entries.push(currentEntry)
                }

                const processedItem = await processListItem(item)
                if (processedItem) {
                  currentEntry.content.push(processedItem)
                }
              }
            }
          }
          break
        }

        case 'listItem': {
          const previousNode = this.getPreviousEntry(currentEntry)

          if (previousNode?.text.endsWith(':')) {
            // If the previous node ends with `:`, we should add this and all subsequent list items to the previous node
            // as they are likely sub-items
            const processedItem = await processListItem(node)
            if (processedItem) {
              previousNode.subItems?.push(processedItem)
            }
          } else {
            // Otherwise, process this list item as a standalone entry
            const processedItem = await processListItem(node)
            if (processedItem) {
              currentEntry?.content.push(processedItem)
            }
          }
          break
        }
        default: {
          // Ensure we have an entry to add content to
          if (!currentEntry) {
            currentEntry = {
              date: undefined,
              filename,
              heading: currentHeading || filename.split('/').pop() || '',
              content: [],
              frontmatter,
            }
            result.entries.push(currentEntry)
          }

          // Skip if this is the same as the current heading
          if (!normalizedText.trim() || normalizedText.trim() === currentHeading?.toLowerCase()) {
            break
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

      // Process children recursively (except for list and paragraph, which we handle specially)
      // Paragraphs only contain text, which is already processed
      if (node.children && node.type !== 'list' && node.type !== 'paragraph') {
        for (const child of node.children) {
          await processNode(child)
        }
      }
    }

    // Start processing from root
    await processNode(ast as MarkdownNode)

    // If no entries were created but we have frontmatter, create a default entry
    if (result.entries.length === 0 && frontmatter) {
      result.entries.push({
        date: undefined,
        filename,
        heading: filename.split('/').pop() || '',
        content: [],
        frontmatter,
      })
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

    // Extract metadata
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
    for (const person of people) {
      if (!metadata.people.includes(person)) {
        metadata.people.push(person)
      }
    }

    // Extract potential tags (words with # or prominent concepts)
    const hashtagMatch = text.match(/#\w+/g)
    if (hashtagMatch) {
      for (const tag of hashtagMatch) {
        const cleanTag = tag.substring(1).toLowerCase()
        if (!metadata.tags.includes(cleanTag)) {
          metadata.tags.push(cleanTag)
        }
      }
    }

    // Look for key concepts that could be tags
    const topics = doc.topics().out('array')
    for (const topic of topics) {
      const cleanTopic = topic.toLowerCase()
      if (!metadata.tags.includes(cleanTopic)) {
        metadata.tags.push(cleanTopic)
      }
    }

    // If we have a content object, update it directly
    if (content) {
      if (!isTask) {
        // Only update type if it's not already a task
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
        // Add current content to the previous paragraph
        previousContent.text += `\n ${processedText}`
      } else {
        // Otherwise create a new content entry (for non-list content)
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
