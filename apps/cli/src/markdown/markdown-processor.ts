import * as mdast from 'mdast-util-to-string'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Node } from 'unist'
import type { Note, ProcessedContent } from './types'
import { getDateFromText, sanitizeText } from './utils'

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

  async processFile(filepath: string, content: string): Promise<ProcessedContent> {
    const tree = await unified().use(remarkParse).parse(content)

    this.traverseNodes(tree as MarkdownNode, filepath)
    return this.content
  }

  private traverseNodes(node: MarkdownNode, filename: string): void {
    if (node.type === 'heading') {
      const text = mdast.toString(node)
      this.currentHeading = sanitizeText(text)
      this.content.headings.push(this.currentHeading)
    }

    if (node.type === 'paragraph') {
      const text = mdast.toString(node)
      const { fullDate } = getDateFromText(text)

      this.content.paragraphs.push({
        file: filename,
        heading: this.currentHeading,
        text: sanitizeText(text),
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
            text: sanitizeText(text),
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
