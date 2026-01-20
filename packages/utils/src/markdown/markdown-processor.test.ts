import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownProcessor } from './markdown-processor';

// Mock the time module
vi.mock('../time', () => {
  return {
    getDatesFromText: () => ({
      dates: [],
      fullDate: undefined,
      year: undefined,
    }),
  };
});

describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
    processor = new MarkdownProcessor();
  });

  describe('processFrontmatter', () => {
    it('should extract frontmatter from markdown content', () => {
      const content = `---
title: Test Document
date: 2023-05-01
tags: test, markdown
---

# Heading 1

Some content here.`;

      const result = processor.processFrontmatter(content);

      expect(result.frontmatter).toEqual({
        title: 'Test Document',
        date: '2023-05-01',
        tags: 'test, markdown',
      });

      expect(result.content).toContain('# Heading 1');
    });

    it('should handle markdown without frontmatter', () => {
      const content = '# Heading 1\n\nSome content here.';

      const result = processor.processFrontmatter(content);

      expect(result.frontmatter).toBeUndefined();
      expect(result.content).toBe(content);
    });
  });

  describe('convertMarkdownToJSON', () => {
    it('should process headings properly', async () => {
      const content =
        '# Heading 1\n\nParagraph under heading 1\n\n## Heading 2\n\nParagraph under heading 2';
      const { result } = await processor.convertMarkdownToJSON(content, 'test.md');
      const entries = result.entries;
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.heading)).toEqual(['Heading 1', 'Heading 2']);
      expect(entries[0].content.map((c) => c.text)).toEqual(['Paragraph under heading 1']);
      expect(entries[1].content.map((c) => c.text)).toEqual(['Paragraph under heading 2']);
    });

    it('should process lists correctly', async () => {
      const content = '# Shopping List\n      \n- Apples\n- Bananas\n- Milk';
      const { result } = await processor.convertMarkdownToJSON(content, 'test.md');
      const entry = result.entries[0];
      expect(entry.heading).toBe('Shopping List');
      expect(entry.content.map((c) => c.text)).toEqual(['- Apples', '- Bananas', '- Milk']);
    });

    it('should detect tasks and their completion status', async () => {
      const content = '# Tasks\n      \n- [ ] Incomplete task\n- [x] Complete task';
      const { result } = await processor.convertMarkdownToJSON(content, 'test.md');
      const entry = result.entries[0];
      const texts = entry.content.map((c) => c.text);
      expect(texts).toEqual(['- [ ] Incomplete task', '- [x] Complete task']);
      expect(entry.content[0].isTask).toBe(true);
      expect(entry.content[0].isComplete).toBe(false);
      expect(entry.content[1].isTask).toBe(true);
      expect(entry.content[1].isComplete).toBe(true);
    });

    it('should handle nested lists properly', async () => {
      const content =
        '# Nested List\n      \n- Fruits:\n  - Apples\n  - Bananas\n- Vegetables:\n  - Carrots\n  - Broccoli';
      const { result } = await processor.convertMarkdownToJSON(content, 'test.md');
      const entry = result.entries[0];
      const texts = entry.content.map((c) => c.text);
      expect(texts).toEqual([
        '- Fruits:',
        '- Apples',
        '- Bananas',
        '- Vegetables:',
        '- Carrots',
        '- Broccoli',
      ]);
    });

    it('should extract metadata from content', async () => {
      const content =
        '# Meeting Notes\n      \nMeeting with John Smith in New York about #project planning.';
      const { result } = await processor.convertMarkdownToJSON(content, 'test.md');
      expect(typeof result.metadata?.wordCount).toBe('number');
      expect(typeof result.metadata?.readingTime).toBe('number');
      expect(result.entries[0].heading).toBe('Meeting Notes');
    });
  });

  describe('processFileWithAst', () => {
    it('should read file and process its content', async () => {
      const fileContent = '# Test Heading\n\nTest content';

      const result = await processor.processFileWithAst(fileContent, 'test.md');

      expect(result.entries.length).toBe(1);
      expect(result.entries[0]?.heading).toBe('Test Heading');
    });
  });
});
