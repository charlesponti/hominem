import {
  MarkdownTextSplitter,
  type RecursiveCharacterTextSplitterParams,
} from 'langchain/text_splitter';
import { toString } from 'mdast-util-to-string';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { parse as parseYaml } from 'yaml';

import { getDatesFromText } from '../time';
import { extractMetadata, type Metadata } from './metadata.schema';

/**
 * Type for markdown AST nodes from remark/unified
 * Covers the common properties used in this processor
 */
interface MarkdownAstNode {
  type: string;
  value?: string;
  depth?: number;
  checked?: boolean;
  children?: MarkdownAstNode[];
  position?: {
    start: { offset: number };
    end: { offset: number };
  };
  [key: string]: unknown;
}

// Document type from langchain
export interface Document<Metadata extends Record<string, unknown> = Record<string, unknown>> {
  pageContent: string;
  metadata: Metadata;
}

/**
 * Utility function to split markdown content into chunks using LangChain's MarkdownTextSplitter.
 */
export async function splitMarkdown(
  content: string,
  options?: Partial<RecursiveCharacterTextSplitterParams>,
): Promise<Document[]> {
  const splitter = MarkdownTextSplitter.fromLanguage('markdown', {
    chunkSize: 512,
    chunkOverlap: 50,
    ...options,
  });
  return await splitter.createDocuments([content]);
}

class MarkdownProcessor {
  async getChunks(
    content: string,
    options?: Partial<RecursiveCharacterTextSplitterParams>,
  ): Promise<string[]> {
    const docs = await splitMarkdown(content, options);
    return docs.map((doc) => doc.pageContent);
  }

  async processFileWithAst(content: string, filename: string): Promise<EntryContent[]> {
    const { result } = await this.convertMarkdownToJSON(content, filename);
    return result;
  }

  processFrontmatter(content: string): {
    metadata: Metadata;
    processableContent: string;
  } {
    const ast = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content);

    let metadata: Metadata = {};
    let processableContent = content;

    const yamlNode = ast.children.find((node) => node.type === 'yaml');
    if (yamlNode && 'value' in yamlNode) {
      try {
        const frontmatter = parseYaml(yamlNode.value as string);
        if (frontmatter) {
          metadata = extractMetadata(frontmatter as Record<string, unknown>);
        }
        if (yamlNode.position) {
          processableContent = content.slice(yamlNode.position.end.offset);
          processableContent = processableContent.replace(/^\n+/, '');
        }
      } catch (e) {
        console.error('Error parsing frontmatter:', e);
      }
    }

    return { metadata, processableContent };
  }

  async convertMarkdownToJSON(
    content: string,
    filename: string,
  ): Promise<{
    result: EntryContent[];
    metadata?: Metadata;
    date?: string | undefined;
    heading: string;
  }> {
    const { metadata: extractedMetadata, processableContent } = this.processFrontmatter(content);

    const ast = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ['yaml'])
      .parse(processableContent);

    const headingNode = ast.children.find((node) => node.type === 'heading');
    const heading = headingNode
      ? toString(headingNode)
      : filename.replace('.md', '').split('_').join(' ');

    const dates = getDatesFromText(processableContent);

    const result = this.extractMarkdownHierarchy(ast.children);

    const date = dates.dates?.[0]?.start;

    return {
      result,
      metadata: extractedMetadata,
      ...(date !== undefined && { date }),
      heading,
    };
  }

  extractMarkdownHierarchy(nodes: unknown[]): EntryContent[] {
    const entries: EntryContent[] = [];

    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue;

      const nodeObj = node as Record<string, unknown>;
      const nodeType = nodeObj.type as string;

      if (nodeType === 'heading') {
        const headingNode = nodeObj as { depth: number; children: unknown[] };
        const text = this.extractText(headingNode.children);
        entries.push({
          tag: `h${headingNode.depth}`,
          text,
          section: null,
        });
      } else if (nodeType === 'paragraph') {
        const paragraphNode = nodeObj as { children: unknown[] };
        const text = this.extractText(paragraphNode.children).trim();
        if (text) {
          entries.push({
            tag: 'p',
            text,
            section: null,
          });
        }
      } else if (nodeType === 'list') {
        const listNode = nodeObj as { children: unknown[] };
        const listEntries = this.extractListItems(listNode.children);
        entries.push(...listEntries);
      }
    }

    return entries;
  }

  private extractListItems(items: unknown[]): EntryContent[] {
    const entries: EntryContent[] = [];

    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;

      const itemObj = item as Record<string, unknown>;
      if (itemObj.type !== 'listItem') continue;

      const listItemNode = itemObj as { checked?: boolean; children: unknown[] };
      const isComplete = listItemNode.checked ?? false;
      const isTask = listItemNode.checked !== undefined;

      const children = listItemNode.children as unknown[];
      for (const child of children) {
        if (typeof child !== 'object' || child === null) continue;

        const childObj = child as Record<string, unknown>;
        if (childObj.type === 'paragraph') {
          const paragraphNode = childObj as { children: unknown[] };
          const text = this.extractText(paragraphNode.children).trim();
          if (text) {
            entries.push({
              tag: 'li',
              text,
              section: null,
              isTask,
              isComplete,
            });
          }
        }
      }
    }

    return entries;
  }

  private extractText(nodes: unknown[]): string {
    const text: string[] = [];

    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue;

      const nodeObj = node as Record<string, unknown>;
      const nodeType = nodeObj.type as string;

      if (nodeType === 'text') {
        const textNode = nodeObj as { value: string };
        text.push(textNode.value);
      } else if (nodeType === 'emphasis' || nodeType === 'strong') {
        const emphasisNode = nodeObj as { children: unknown[] };
        text.push(this.extractText(emphasisNode.children));
      } else if (nodeType === 'link') {
        const linkNode = nodeObj as { children: unknown[] };
        text.push(this.extractText(linkNode.children));
      } else if (nodeType === 'code') {
        const codeNode = nodeObj as { value: string };
        text.push(codeNode.value);
      }
    }

    return text.join('');
  }
}

interface EntryContent {
  tag: string;
  text: string;
  section: string | null;
  isTask?: boolean;
  isComplete?: boolean;
  subentries?: EntryContent[];
}

interface ProcessedMarkdownFileEntry {
  content: EntryContent[];
  date?: string;
  filename: string;
  heading: string;
  metadata?: Metadata;
}
