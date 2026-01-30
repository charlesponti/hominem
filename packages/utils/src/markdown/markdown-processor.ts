import type { Document } from '@langchain/core/documents';

import { load as cheerio } from 'cheerio';
import {
  MarkdownTextSplitter,
  type RecursiveCharacterTextSplitterParams,
} from 'langchain/text_splitter';

export type { RecursiveCharacterTextSplitterParams };
import { toString } from 'mdast-util-to-string';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { parse as parseYaml } from 'yaml';

import type { TextAnalysis } from '../schemas/text-analysis.schema';

import { getDatesFromText } from '../time';
import { extractMetadata, type Metadata } from './metadata.schema';

export interface EntryContent {
  tag: string;
  text: string;
  section: string | null;
  isTask?: boolean;
  isComplete?: boolean;
  textAnalysis?: TextAnalysis;
  subentries?: EntryContent[];
}

export interface ProcessedMarkdownFileEntry {
  content: EntryContent[];
  date?: string;
  filename: string;
  heading: string;
  metadata?: Metadata;
  frontmatter?: Record<string, unknown>;
}

export interface ProcessedMarkdownFile {
  entries: ProcessedMarkdownFileEntry[];
  metadata?: Metadata;
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

export class MarkdownProcessor {
  async getChunks(content: string, options?: Partial<RecursiveCharacterTextSplitterParams>) {
    const docs = await splitMarkdown(content, options);
    return docs.map((doc) => doc.pageContent);
  }

  async processFileWithAst(content: string, filename: string): Promise<ProcessedMarkdownFile> {
    const { result } = await this.convertMarkdownToJSON(content, filename);

    return result;
  }

  processFrontmatter(content: string): {
    content: string;
    metadata: Metadata;
    frontmatter?: Record<string, unknown>;
  } {
    const ast = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content);

    let frontmatter: Record<string, unknown> | undefined;
    let metadata: Metadata = {};
    let processableContent = content;

    const yamlNode = ast.children.find((node) => node.type === 'yaml');
    if (yamlNode && 'value' in yamlNode) {
      try {
        frontmatter = parseYaml(yamlNode.value);
        if (frontmatter) {
          metadata = extractMetadata(frontmatter);
        }
        if (yamlNode.position) {
          processableContent = content.slice(yamlNode.position.end.offset);
          processableContent = processableContent.replace(/^\n+/, '');
        }
      } catch (e) {
        console.error('Failed to parse frontmatter', e);
      }
    }

    return { content: processableContent, metadata, frontmatter };
  }

  async convertMarkdownToHTML(content: string) {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(content);

    return cheerio(String(file));
  }

  convertMarkdownToAST(content: string) {
    const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter);
    return processor.parse(content);
  }

  private async calculateReadingMetrics(
    content: string,
  ): Promise<{ wordCount: number; readingTime: number }> {
    const words = content.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200);

    return { wordCount: words, readingTime };
  }

  async convertMarkdownToJSON(
    markdownContent: string,
    filename: string,
  ): Promise<{ result: ProcessedMarkdownFile; html: string }> {
    const ast = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ['yaml'])
      .parse(markdownContent);

    let frontmatter: Record<string, unknown> | undefined;
    let metadata: Metadata = {};

    const yamlNode = ast.children.find((node) => node.type === 'yaml');
    if (yamlNode && 'value' in yamlNode) {
      try {
        frontmatter = parseYaml(yamlNode.value);
        if (frontmatter) {
          metadata = extractMetadata(frontmatter);
        }
      } catch (e) {
        console.error('Failed to parse frontmatter', e);
      }
    }

    const fullText = toString(ast);
    const { wordCount, readingTime } = await this.calculateReadingMetrics(fullText);
    metadata.wordCount = wordCount;
    metadata.readingTime = readingTime;

    const baseName = filename.split('/').pop()?.replace(/\.md$/, '') || filename;
    const entries: ProcessedMarkdownFileEntry[] = [];
    let currentHeading = '';

    const createEntry = (heading: string): ProcessedMarkdownFileEntry => {
      const { dates, fullDate } = getDatesFromText(heading);
      const entry: ProcessedMarkdownFileEntry = {
        filename,
        heading,
        content: [],
        frontmatter,
      };
      if (dates?.[0]) {
        entry.date = dates[0].start.split('T')[0];
      } else if (fullDate) {
        entry.date = fullDate.split('T')[0];
      }
      return entry;
    };

    let currentEntry = createEntry(baseName);
    entries.push(currentEntry);

    for (const node of ast.children) {
      if (node.type === 'heading') {
        const headingText = toString(node);
        if (currentEntry.content.length === 0 && currentEntry.heading === baseName) {
          currentEntry.heading = headingText;
          const { dates, fullDate } = getDatesFromText(headingText);
          if (dates?.[0]) {
            currentEntry.date = dates[0].start.split('T')[0];
          } else if (fullDate) {
            currentEntry.date = fullDate.split('T')[0];
          }
        } else {
          currentEntry = createEntry(headingText);
          entries.push(currentEntry);
        }
        currentHeading = headingText;
      } else if (node.type === 'yaml') {
        continue;
      } else if (node.type === 'list') {
        const visitList = (listNode: any) => {
          for (const li of listNode.children) {
            if (li.type === 'listItem') {
              const textContent = li.children
                .filter((child: any) => child.type !== 'list')
                .map((child: any) => toString(child))
                .join(' ')
                .trim();

              const isTask = typeof li.checked === 'boolean';
              const isComplete = !!li.checked;

              if (textContent) {
                currentEntry.content.push({
                  tag: isTask ? 'task' : 'list-item',
                  text: isTask
                    ? `${listNode.ordered ? '1.' : '-'} [${isComplete ? 'x' : ' '}] ${textContent}`
                    : `${listNode.ordered ? '1.' : '-'} ${textContent}`,
                  section: currentHeading || null,
                  isTask,
                  isComplete,
                  subentries: [],
                });
              }

              for (const child of li.children) {
                if (child.type === 'list') {
                  visitList(child);
                }
              }
            }
          }
        };
        visitList(node);
      } else if (node.type === 'paragraph' || node.type === 'blockquote' || node.type === 'code') {
        const text = toString(node);
        if (text.trim()) {
          currentEntry.content.push({
            tag: node.type,
            text,
            section: currentHeading || null,
            subentries: [],
          });
        }
      }
    }

    const finalEntries = entries.filter((e) => e.content.length > 0);

    const htmlResult = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(markdownContent);

    return { result: { entries: finalEntries, metadata }, html: String(htmlResult) };
  }

  getPreviousEntry(entry: ProcessedMarkdownFileEntry | null): EntryContent | undefined {
    if (!entry) {
      return undefined;
    }
    return entry.content[entry.content.length - 1];
  }
}
