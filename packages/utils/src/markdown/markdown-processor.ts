import {
  MarkdownTextSplitter,
  type RecursiveCharacterTextSplitterParams,
} from 'langchain/text_splitter';

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
