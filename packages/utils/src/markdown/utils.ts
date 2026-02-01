/**
 * Utility functions for markdown processing
 */

export function normalizeMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

export function stripMarkdownFormatting(content: string): string {
  return content
    .replace(/[*_]{1,2}([^*_\n]+)[*_]{1,2}/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/[-*]\s/g, '')
    .trim();
}

export function extractCodeBlocks(content: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const matches = content.match(codeBlockRegex);
  return matches ? matches.map((block) => block.replace(/```/g, '').trim()) : [];
}
