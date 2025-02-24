import { logger } from '@ponti/utils/logger'
import * as mdast from 'mdast-util-to-string'
import * as fs from 'node:fs/promises'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Node } from 'unist'
import type { ProcessedContent } from './types'
import { getDateFromText, normalizeWhitespace } from './utils'

interface MarkdownNode extends Node {
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

  async processFile(filepath: string): Promise<ProcessedContent> {
    const content = await fs.readFile(filepath, 'utf-8')
    const tree = unified().use(remarkParse).parse(content)

    this.traverseNodes(tree as MarkdownNode, filepath)
    return this.content
  }

  private traverseNodes(node: MarkdownNode, filename: string): void {
    const text = mdast.toString(node)
    const { fullDate } = getDateFromText(text)

    if (node.type === 'heading') {
      this.currentHeading = normalizeWhitespace(text)
      this.content.headings.push({
        text: this.currentHeading,
        tag: 'heading',
      })
    }

    if (node.type === 'paragraph') {
      this.content.paragraphs.push({
        file: filename,
        heading: this.currentHeading,
        text: normalizeWhitespace(text),
        tag: 'paragraph',
        date: fullDate,
      })
    }

    if (node.type === 'list') {
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
    }

    // Traverse children
    if (node.children) {
      for (const child of node.children) {
        this.traverseNodes(child, filename)
      }
    }
  }
}
