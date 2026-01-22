import { load as cheerio } from 'cheerio';
import type {
  Document
} from '@langchain/core/documents';
import {
  MarkdownTextSplitter,
  type RecursiveCharacterTextSplitterParams,
} from 'langchain/text_splitter';

export type { RecursiveCharacterTextSplitterParams };
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import type { TextAnalysis } from '../schemas/text-analysis.schema';

import { getDatesFromText } from '../time';
import { extractMetadata, type Metadata } from './metadata.schema';
import { detectTask, normalizeWhitespace } from './utils';

export interface EntryContent {
  tag: string;
  text: string;
  section: string | null;
  isTask?: boolean;
  isComplete?: boolean;
  textAnalysis?: TextAnalysis;
  subentries?: EntryContent[];
}

interface GetProcessedEntryParams {
  $: ReturnType<typeof import('cheerio').load>;
  elem: ReturnType<ReturnType<typeof import('cheerio').load>>[0];
  entry: {
    content: EntryContent[];
    date?: string;
    filename: string;
    heading: string;
  };
  section: string | null;
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
    // Find the frontmatter content at the start of the file
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    let frontmatter: Record<string, unknown> | undefined;
    let processableContent = content;
    let metadata: Metadata = {};

    if (frontmatterMatch) {
      // Parse the frontmatter content (assuming YAML format)
      const frontmatterContent = frontmatterMatch[1];

      if (!frontmatterContent) {
        return { content, metadata, frontmatter: undefined };
      }

      // Extract key-value pairs
      frontmatter = Object.fromEntries(
        frontmatterContent
          .split('\n')
          .filter((line) => line.includes(':'))
          .map((line) => {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            if (!key) {
              return [value];
            }
            return [key.trim(), value.replace(/^['"]|['"]$/g, '')];
          }),
      );

      // Validate and extract metadata
      if (frontmatter) {
        metadata = extractMetadata(frontmatter);
      }

      // Remove the frontmatter from the content
      processableContent = content.slice(frontmatterMatch[0].length);
    }

    return { content: processableContent, metadata, frontmatter };
  }

  async convertMarkdownToHTML(content: string) {
    const file = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(content);

    return cheerio(String(file));
  }

  convertMarkdownToAST(content: string) {
    const processor = unified().use(remarkParse);
    return processor.parse(content);
  }

  private async calculateReadingMetrics(
    content: string,
  ): Promise<{ wordCount: number; readingTime: number }> {
    const words = content.trim().split(/\s+/).length;
    // Average reading speed: 200-250 words per minute
    const readingTime = Math.ceil(words / 200);

    return { wordCount: words, readingTime };
  }

  async convertMarkdownToJSON(
    markdownContent: string,
    filename: string,
  ): Promise<{ result: ProcessedMarkdownFile; html: string }> {
    const { content: body, metadata, frontmatter } = this.processFrontmatter(markdownContent);
    const { wordCount, readingTime } = await this.calculateReadingMetrics(body);
    metadata.wordCount = wordCount;
    metadata.readingTime = readingTime;

    const baseName = filename.split('/').pop()?.replace(/\.md$/, '') || filename;
    const headingRegex = /^#{1,6}\s+(.*)/;
    const lines = body.split('\n');
    const entries: ProcessedMarkdownFileEntry[] = [];
    let currentHeading = '';
    let buffer: string[] = [];

    const flushBuffer = () => {
      const texts = buffer.map((l) => l.trim()).filter((l) => l);
      if (!texts.length) {
        return;
      }
      const heading = currentHeading || baseName;
      const { dates, fullDate } = getDatesFromText(heading);
      const entry: ProcessedMarkdownFileEntry = { filename, heading, content: [], frontmatter };
      if (dates?.[0]) {
        entry.date = dates[0].start.split('T')[0];
      } else if (fullDate) {
        entry.date = fullDate.split('T')[0];
      }
      for (const text of texts) {
        const normalized = normalizeWhitespace(text);
        const { isTask, isComplete } = detectTask(normalized);
        entry.content.push({
          tag: 'text',
          text,
          section: currentHeading || null,
          isTask,
          isComplete,
          subentries: [],
        });
      }
      entries.push(entry);
    };

    for (const line of lines) {
      const match = headingRegex.exec(line);
      if (match) {
        flushBuffer();
        currentHeading = match[1]?.trim() || '';
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
    flushBuffer();

    const result: ProcessedMarkdownFile = { entries, metadata };
    return { result, html: body };
  }

  async getProcessedEntry(params: GetProcessedEntryParams): Promise<EntryContent | undefined> {
    const { $, elem, section } = params;
    const text = $(elem).contents().first().text().trim();
    if (!text) {
      return;
    }
    const normalizedText = normalizeWhitespace(text);
    const { isTask, isComplete, taskText } = detectTask(normalizedText);

    return {
      tag: elem.type,
      text: taskText || normalizedText,
      section,
      isTask,
      isComplete,
      subentries: [],
    };
  }

  getPreviousEntry(entry: ProcessedMarkdownFileEntry | null): EntryContent | undefined {
    if (!entry) {
      return undefined;
    }
    return entry.content[entry.content.length - 1];
  }
}
