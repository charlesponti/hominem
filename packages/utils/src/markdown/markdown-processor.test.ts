import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownProcessor } from './markdown-processor'

// Mock the time module
vi.mock('../time.js', () => {
  return {
    getDatesFromText: () => ({
      dates: [],
      fullDate: undefined,
      year: undefined,
    }),
  }
})

describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor

  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
    processor = new MarkdownProcessor()
  })

  describe('processFrontmatter', () => {
    it('should extract frontmatter from markdown content', () => {
      const content = `---
title: Test Document
date: 2023-05-01
tags: test, markdown
---

# Heading 1

Some content here.`

      const result = processor.processFrontmatter(content)

      expect(result.frontmatter).toEqual({
        title: 'Test Document',
        date: '2023-05-01',
        tags: 'test, markdown',
      })

      expect(result.content).toContain('# Heading 1')
    })

    it('should handle markdown without frontmatter', () => {
      const content = '# Heading 1\n\nSome content here.'

      const result = processor.processFrontmatter(content)

      expect(result.frontmatter).toBeUndefined()
      expect(result.content).toBe(content)
    })
  })

  describe('convertMarkdownToJSON', () => {
    it('should process headings properly', async () => {
      const content =
        '# Heading 1\n\nParagraph under heading 1\n\n## Heading 2\n\nParagraph under heading 2'

      const { result } = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result).toMatchSnapshot()
    })

    it('should process lists correctly', async () => {
      const content = `# Shopping List
      
- Apples
- Bananas
- Milk`

      const { result } = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result).toMatchSnapshot()
    })

    it('should detect tasks and their completion status', async () => {
      const content = `# Tasks
      
- [ ] Incomplete task
- [x] Complete task`

      const { result } = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result).toMatchSnapshot()
    })

    it('should handle nested lists properly', async () => {
      const content = `# Nested List
      
- Fruits:
  - Apples
  - Bananas
- Vegetables:
  - Carrots
  - Broccoli`

      const { result } = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result).toMatchSnapshot()
    })

    it('should extract metadata from content', async () => {
      const content = `# Meeting Notes
      
Meeting with John Smith in New York about #project planning.`

      const { result } = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result).toMatchSnapshot()
    })

    it('should correctly process hierarchical lists with personal reflections', async () => {
      const markdown = `## personal
- **Perfectionism**
- **Overthinking, analysis paralysis, fear of failure**
  - decrease my playfulness.
  - decreases poor decision-making
  - decreases action-taking
  - reinforces personal beliefs instead of increasing objective truth
- **Fear of judgement**
  - desire to be seen as correct instead of desire to be effective
  - many judgments should be ignored because they lack sincerity`

      const { result } = await processor.convertMarkdownToJSON(markdown, 'personal-reflections.md')

      expect(result).toMatchSnapshot()
    })
  })

  describe('processFileWithAst', () => {
    it('should read file and process its content', async () => {
      const fileContent = '# Test Heading\n\nTest content'

      const result = await processor.processFileWithAst(fileContent, 'test.md')

      expect(result.entries.length).toBe(1)
      expect(result.entries[0]?.heading).toBe('Test Heading')
    })
  })
})
