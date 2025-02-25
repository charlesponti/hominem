import { logger } from '@ponti/utils/logger'
import { EnhancedNLPProcessor, type EmotionalJourney, type NLPAnalysis } from '@ponti/utils/nlp'
import * as chrono from 'chrono-node'
import nlp from 'compromise'
import * as mdast from 'mdast-util-to-string'
import * as fs from 'node:fs/promises'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Node } from 'unist'
import type { ProcessedContent } from './types'
import { getDateFromText, normalizeWhitespace } from './utils'

// Define the structure for our resulting JSON
export interface ProcessedMarkdownFileEntry {
  content: EntryContent[]
  date: string | undefined
  filename: string
  heading: string | undefined
  metadata?: {
    location?: string
    people?: string[]
    tags?: string[]
  }
  nlpAnalysis?: {
    textAnalysis: NLPAnalysis
    emotionalJourney: EmotionalJourney[]
    actionItems: ActionItems
    socialContext: SocialContext
    decisions: Decisions
    habits: Habits
  }
}

export interface EntryContent {
  tag: string
  type: 'thought' | 'activity' | 'quote' | 'dream'
  text: string
  section: string | null
  sentiment?: 'positive' | 'negative' | 'neutral'
  subItems?: EntryContent[]
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

  // Main function to convert markdown to structured JSON
  async convertMarkdownToJSON(
    markdownContent: string,
    filename: string
  ): Promise<ProcessedMarkdownFile> {
    const journalData: ProcessedMarkdownFile = {
      entries: [],
    }

    const processor = unified().use(remarkParse)
    const ast = processor.parse(markdownContent)

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
      const doc = nlp(normalizedText)

      // Create the content entry
      const content: EntryContent = {
        tag: item.type,
        type: 'thought', // Will be updated by processContent
        text: normalizedText,
        section: currentHeading?.toLowerCase() || null,
        subItems: [],
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
          heading: undefined,
          content: [],
          metadata: {
            location: undefined,
            people: [],
            tags: [],
          },
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

    const processNode = (node: MarkdownNode) => {
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
            metadata: {
              location: undefined,
              people: [],
              tags: [],
            },
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
                    heading: undefined,
                    content: [],
                    metadata: {
                      location: undefined,
                      people: [],
                      tags: [],
                    },
                  }
                  journalData.entries.push(currentEntry)
                }

                const processedItem = processListItem(item)
                if (processedItem) {
                  currentEntry.content.push(processedItem)
                  // Extract metadata from the main item and subitems
                  const doc = nlp(processedItem.text)
                  this.extractMetadata(doc, processedItem.text, currentEntry)

                  // Also process metadata from subitems
                  for (const subItem of processedItem.subItems || []) {
                    const subDoc = nlp(subItem.text)
                    this.extractMetadata(subDoc, subItem.text, currentEntry)
                  }
                }
              }
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
              heading: undefined,
              content: [],
              metadata: {
                location: undefined,
                people: [],
                tags: [],
              },
            }
            journalData.entries.push(currentEntry)
          }

          const normalizedText = normalizeWhitespace(text)
          if (normalizedText.trim()) {
            const doc = nlp(normalizedText)
            this.extractMetadata(doc, normalizedText, currentEntry)
            this.processContent({
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

    logger.info(`Processed ${journalData.entries.length} entries in ${filename.split('/').pop()}`)
    return journalData
  }

  // Helper function to process content and categorize it using NLP
  processContent({
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
  }): void {
    if (!text) return

    // Remove leading dashes from bullet points
    let processedText = text.replace(/^- /, '')

    // Use compromise for basic NLP analysis
    const doc = nlp(text)

    // Extract potential metadata
    this.extractMetadata(doc, text, entry)

    // Detect content type
    let contentType: 'thought' | 'activity' | 'quote' | 'dream' = 'thought'

    // If it's wrapped in underscores, it's a quote
    if (/^_.*_$/.test(text)) {
      contentType = 'quote'
      processedText = text.replace(/^_|_$/g, '')
    }
    // If it mentions a dream, it's a dream
    else if (
      processedText.toLowerCase().includes('dream:') ||
      processedText.toLowerCase().includes('dream -') ||
      doc.has('I dreamed') ||
      doc.has('my dream')
    ) {
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

    // Determine rough sentiment
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (doc.has('(good|great|happy|excited|love|enjoy|excellent|wonderful|fantastic)')) {
      sentiment = 'positive'
    } else if (doc.has('(bad|sad|angry|upset|hate|terrible|awful|disappointing|annoying)')) {
      sentiment = 'negative'
    }

    // If we have a content object, update it directly
    if (contentObj) {
      contentObj.type = contentType
      contentObj.sentiment = sentiment
      contentObj.section = section
    } else {
      const previousContent = entry.content[entry.content.length - 1]

      if (previousContent && previousContent.tag === 'paragraph' && tag === 'paragraph') {
        // Add current content to the previous paragraph
        previousContent.text += `\n ${processedText}`
      } else {
        // Otherwise create a new content entry (for non-list content)
        entry.content.push({
          tag,
          type: contentType,
          text,
          section,
          sentiment,
        })
      }
    }
  }

  // Helper function to extract metadata
  extractMetadata(
    doc: ReturnType<typeof nlp>,
    text: string,
    entry: ProcessedMarkdownFileEntry
  ): void {
    if (!entry.metadata) {
      entry.metadata = { location: undefined, people: [], tags: [] }
    }

    // Extract locations
    const locations = doc.places().out('array')
    if (locations.length > 0 && !entry.metadata.location) {
      entry.metadata.location = locations[0]
    }

    // Extract people
    const people = doc.people().out('array')
    for (const person of people) {
      if (!entry.metadata.people?.includes(person)) {
        entry.metadata.people?.push(person)
      }
    }

    // Extract potential tags (words with # or prominent concepts)
    const hashtagMatch = text.match(/#\w+/g)
    if (hashtagMatch) {
      for (const tag of hashtagMatch) {
        const cleanTag = tag.substring(1).toLowerCase()
        if (!entry.metadata.tags?.includes(cleanTag)) {
          entry.metadata.tags?.push(cleanTag)
        }
      }
    }

    // Look for key concepts that could be tags
    const topics = doc.topics().out('array')
    for (const topic of topics) {
      const cleanTopic = topic.toLowerCase()
      if (!entry.metadata.tags?.includes(cleanTopic)) {
        entry.metadata.tags?.push(cleanTopic)
      }
    }
  }
}

// Integration with MarkdownProcessor
class EnhancedMarkdownProcessor extends MarkdownProcessor {
  private nlpProcessor = new EnhancedNLPProcessor()

  processContent(params: {
    tag: string
    text: string
    entry: ProcessedMarkdownFileEntry
    section: string | null
    contentObj?: EntryContent
  }): void {
    super.processContent(params)

    // Add NLP analysis to the entry
    if (!params.entry.nlpAnalysis) {
      params.entry.nlpAnalysis = {
        textAnalysis: this.nlpProcessor.analyzeText(params.text),
        emotionalJourney: this.nlpProcessor.analyzeEmotionalJourney(params.text),
        actionItems: this.nlpProcessor.findActionItems(params.text),
        socialContext: this.nlpProcessor.analyzeSocialInteractions(params.text),
        decisions: this.nlpProcessor.analyzeDecisions(params.text),
        habits: this.nlpProcessor.analyzeHabits(params.text),
      }
    }
  }
}
