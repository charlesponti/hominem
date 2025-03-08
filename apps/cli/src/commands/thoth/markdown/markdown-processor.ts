import { logger } from '@ponti/utils/logger'
import { EnhancedNLPProcessor, type TextAnalysis, type TextAnalysisEmotion } from '@ponti/utils/nlp'
import * as chrono from 'chrono-node'
import nlp from 'compromise'
import * as mdast from 'mdast-util-to-string'
import * as fs from 'node:fs/promises'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Node } from 'unist'
import type { ProcessedContent } from './types'
import { detectDream, detectTask, getDateFromText, normalizeWhitespace } from './utils'

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
  type: 'thought' | 'activity' | 'quote' | 'dream' | 'task'
  text: string
  section: string | null
  subItems?: EntryContent[]
  isComplete?: boolean
  metadata?: {
    location?: string
    people?: string[]
    tags?: string[]
  }
  nlpAnalysis?: {
    textAnalysis: TextAnalysis
    emotionalJourney: TextAnalysisEmotion[]
    actionItems: ActionItems
    socialContext: SocialContext
    decisions: Decisions
    habits: Habits
  }
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

interface ActionItems {
  todos: string[]
  commitments: string[]
  deadlines: string[]
}

interface SocialContext {
  people: string[]
  activities: string[]
  communications: string[]
}

interface Decisions {
  decisions: string[]
  alternatives: string[]
  reasoning: string[]
}

interface Habits {
  routines: string[]
  frequency: string[]
  timePatterns: string[]
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

  async processFile(filepath: string): Promise<ProcessedContent> {
    const content = await fs.readFile(filepath, 'utf-8')
    const tree = unified().use(remarkParse).parse(content)

    this.traverseNodes(tree as MarkdownNode, filepath)
    return this.content
  }

  async processFileWithAst(filepath: string): Promise<ProcessedMarkdownFile> {
    // Check that the file exists
    if (!(await fs.stat(filepath)).isFile()) {
      throw new Error(`File not found: ${filepath}`)
    }

    const content = await fs.readFile(filepath, 'utf-8')
    return this.convertMarkdownToJSON(content, filepath)
  }

  private traverseNodes(node: MarkdownNode, filename: string): void {
    const text = mdast.toString(node)
    const { fullDate } = getDateFromText(text)

    switch (node.type) {
      case 'heading': {
        this.currentHeading = normalizeWhitespace(text)
        this.content.headings.push({
          text: this.currentHeading,
          tag: 'heading',
        })
        break
      }
      case 'list': {
        for (const item of node.children as MarkdownNode[]) {
          if (item.type === 'listItem') {
            const text = mdast.toString(item)
            const { fullDate } = getDateFromText(text)

            this.content.bulletPoints.push({
              file: filename,
              heading: this.currentHeading,
              text: normalizeWhitespace(text),
              tag: 'bullet_point',
              date: fullDate,
            })
          }
        }
        break
      }
      case 'paragraph':
      default: {
        this.content.paragraphs.push({
          file: filename,
          heading: this.currentHeading,
          text: normalizeWhitespace(text),
          tag: 'paragraph',
          date: fullDate,
        })
        break
      }
    }

    // Traverse children
    if (node.children) {
      for (const child of node.children) {
        this.traverseNodes(child, filename)
      }
    }
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

  // Main function to convert markdown to structured JSON
  async convertMarkdownToJSON(
    markdownContent: string,
    filename: string
  ): Promise<ProcessedMarkdownFile> {
    const journalData: ProcessedMarkdownFile = {
      entries: [],
    }

    // Extract frontmatter if present
    const { content: processableContent, frontmatter } = this.processFrontmatter(markdownContent)
    const processor = unified().use(remarkParse)
    const ast = processor.parse(processableContent)

    let currentEntry: ProcessedMarkdownFileEntry | null = null
    let currentHeading: string | undefined

    const processListItem = (item: MarkdownNode): EntryContent | null => {
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
              const processedSubItem = processListItem(subItem)
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

        journalData.entries.push(currentEntry)
      }

      // Process the content type and sentiment
      this.processContent({
        tag: item.type,
        text: normalizedText,
        entry: currentEntry,
        section: currentHeading?.toLowerCase() || null,
        contentObj: content,
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
      const { fullDate } = getDateFromText(text)

      switch (node.type) {
        case 'heading': {
          currentHeading = normalizeWhitespace(text)
          const parsedDates = chrono.parse(text)
          const parsedDate =
            parsedDates.length > 0
              ? parsedDates[0].start.date()?.toISOString().split('T')[0]
              : fullDate

          currentEntry = {
            date: parsedDate,
            filename,
            heading: currentHeading,
            content: [],
            frontmatter,
          }
          journalData.entries.push(currentEntry)
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
                  journalData.entries.push(currentEntry)
                }

                const processedItem = processListItem(item)
                if (processedItem) {
                  currentEntry.content.push(processedItem)
                }
              }
            }
          }
          break
        }

        case 'listItem': {
          // If the previous node ends with `:`, we should add this and all subsequent list items to the previous node
          // as they are likely sub-items
          const previousNode = getPreviousEntry(currentEntry)

          if (previousNode?.text.endsWith(':')) {
            const processedItem = processListItem(node)
            if (processedItem) {
              previousNode.subItems?.push(processedItem)
            }
          } else {
            // Otherwise, process this list item as a standalone entry
            const processedItem = processListItem(node)
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
            journalData.entries.push(currentEntry)
          }

          const normalizedText = normalizeWhitespace(text)
          const section = currentHeading?.toLowerCase() || null
          if (normalizedText.trim() === section) {
            // skip this entry
            break
          }

          if (normalizedText.trim()) {
            await this.processContent({
              tag: node.type,
              text: normalizedText,
              entry: currentEntry,
              section: currentHeading?.toLowerCase() || null,
            })
          }
          break
        }
      }

      // Process children recursively (except for list, which we handle specially)
      if (node.children && node.type !== 'list') {
        for (const child of node.children) {
          processNode(child)
        }
      }
    }

    // Start processing from root
    processNode(ast as MarkdownNode)

    // If no entries were created but we have frontmatter, create a default entry
    if (journalData.entries.length === 0 && frontmatter) {
      journalData.entries.push({
        date: undefined,
        filename,
        heading: filename.split('/').pop() || '',
        content: [],
        frontmatter,
      })
    }

    return journalData
  }

  // Helper function to process content and categorize it using NLP
  async processContent({
    tag,
    text,
    entry,
    section,
    contentObj,
  }: {
    tag: string
    text: string
    entry: ProcessedMarkdownFileEntry
    section: string | null
    contentObj?: EntryContent
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

    // Detect content type (skip if it's already a task)
    let contentType: 'thought' | 'activity' | 'quote' | 'dream' | 'task' = isTask
      ? 'task'
      : 'thought'

    if (!isTask) {
      // If it's wrapped in underscores, it's a quote
      if (/^_.*_$/.test(text)) {
        contentType = 'quote'
        processedText = text.replace(/^_|_$/g, '')
      }
      // If it mentions a dream, it's a dream
      else if (detectDream(doc.out('array')) || section?.toLowerCase().includes('dream')) {
        contentType = 'dream'
      }
      // If the section is "Did" or if it has multiple verbs in past tense, likely an activity
      else if (section === 'did' || doc.has('#PastTense+')) {
        // Additional check for activity-like statements
        if (doc.has('(drove|got|checked|browsed|dinner|went|bought|visited|attended)')) {
          contentType = 'activity'
        } else {
          // Check if the sentence starts with a verb in past tense
          const firstWord = processedText.split(' ')[0].toLowerCase()
          if (
            ['drove', 'got', 'checked', 'browsed', 'ate', 'visited', 'bought', 'went'].includes(
              firstWord
            )
          ) {
            contentType = 'activity'
          }
        }
      }
    }

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
    if (contentObj) {
      if (!isTask) {
        // Only update type if it's not already a task
        contentObj.type = contentType
      }
      contentObj.section = section
      contentObj.metadata = metadata
      if (isTask) {
        contentObj.isComplete = isComplete
      }
    } else {
      const previousContent = getPreviousEntry(entry)

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
}

// Integration with MarkdownProcessor
export class EnhancedMarkdownProcessor extends MarkdownProcessor {
  private nlpProcessor = new EnhancedNLPProcessor()

  async processContent(params: {
    tag: string
    text: string
    entry: ProcessedMarkdownFileEntry
    section: string | null
    contentObj?: EntryContent
  }): Promise<void> {
    await super.processContent(params)

    // Add NLP analysis to the content object
    const nlpAnalysis = {
      textAnalysis: await this.nlpProcessor.analyzeText(params.text),
      emotionalJourney: await this.nlpProcessor.analyzeEmotionalJourney(params.text),
      actionItems: await this.nlpProcessor.findActionItems(params.text),
      socialContext: await this.nlpProcessor.analyzeSocialInteractions(params.text),
      decisions: await this.nlpProcessor.analyzeDecisions(params.text),
      habits: await this.nlpProcessor.analyzeHabits(params.text),
    }

    if (params.contentObj) {
      params.contentObj.nlpAnalysis = nlpAnalysis
    } else {
      const content = getPreviousEntry(params.entry)
      if (content) {
        content.nlpAnalysis = nlpAnalysis
      }
    }
  }
}

function getPreviousEntry(entry: ProcessedMarkdownFileEntry | null): EntryContent | undefined {
  if (!entry) return undefined
  return entry.content[entry.content.length - 1]
}
