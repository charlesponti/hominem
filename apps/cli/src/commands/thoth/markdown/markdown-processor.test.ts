import * as fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownProcessor } from './markdown-processor'

vi.mock('node:fs/promises')
vi.mock('@ponti/utils/nlp')
// vi.mock('@ponti/utils/time', () => ({
//   getDatesFromText: vi.fn().mockReturnValue({ dates: [], fullDate: undefined }),
// }))

describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor

  beforeEach(() => {
    vi.resetAllMocks()
    processor = new MarkdownProcessor()

    // Mock fs.stat to always return { isFile: () => true } for file existence checks
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => true,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } as any)
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

      const result = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result.entries.length).toBe(2)
      expect(result.entries[0].heading).toBe('Heading 1')
      expect(result.entries[1].heading).toBe('Heading 2')
    })

    it('should process lists correctly', async () => {
      const content = `# Shopping List
      
- Apples
- Bananas
- Milk`

      const result = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result.entries.length).toBe(1)
      expect(result.entries[0].content.length).toBe(4)
      expect(result.entries[0].content[0].text).toBe('Shopping List')
      expect(result.entries[0].content[1].text).toBe('Apples')
      expect(result.entries[0].content[2].text).toBe('Bananas')
      expect(result.entries[0].content[3].text).toBe('Milk')
    })

    it('should detect tasks and their completion status', async () => {
      const content = `# Tasks
      
- [ ] Incomplete task
- [x] Complete task`

      const result = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result.entries[0].content[0].type).toBe('thought')
      expect(result.entries[0].content[0].text).toBe('Tasks')
      expect(result.entries[0].content[1].text).toBe('Incomplete task')
      expect(result.entries[0].content[1].type).toBe('task')
      expect(result.entries[0].content[1].isComplete).toBe(false)
      expect(result.entries[0].content[2].text).toBe('Complete task')
      expect(result.entries[0].content[2].type).toBe('task')
      expect(result.entries[0].content[2].isComplete).toBe(true)
    })

    it('should handle nested lists properly', async () => {
      const content = `# Nested List
      
- Fruits:
  - Apples
  - Bananas
- Vegetables:
  - Carrots
  - Broccoli`

      const result = await processor.convertMarkdownToJSON(content, 'test.md')

      // Check that we have exactly 2 top level items (Fruits and Vegetables)
      expect(result.entries[0].content.length).toBe(3)

      // Check first item (Fruits)
      expect(result.entries[0].content[1].text).toBe('Fruits:')
      expect(result.entries[0].content[1].subItems?.length).toBe(2)
      expect(result.entries[0].content[1].subItems?.[0].text).toBe('Apples')
      expect(result.entries[0].content[1].subItems?.[1].text).toBe('Bananas')

      // Check second item (Vegetables)
      expect(result.entries[0].content[2].text).toBe('Vegetables:')
      expect(result.entries[0].content[2].subItems?.length).toBe(2)
      expect(result.entries[0].content[2].subItems?.[0].text).toBe('Carrots')
      expect(result.entries[0].content[2].subItems?.[1].text).toBe('Broccoli')
    })

    it('should extract metadata from content', async () => {
      const content = `# Meeting Notes
      
Meeting with John Smith in New York about #project planning.`

      const result = await processor.convertMarkdownToJSON(content, 'test.md')

      expect(result.entries[0].content[0].text).toBe('Meeting Notes')
      expect(result.entries[0].content[1].metadata?.people).toContain('John Smith')
      expect(result.entries[0].content[1].section).toContain('meeting notes')
      expect(result.entries[0].content[1].metadata?.location).toBe('New York')
      expect(result.entries[0].content[1].metadata?.tags).toContain('project')
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

      const result = await processor.convertMarkdownToJSON(markdown, 'personal-reflections.md')

      // Test the basic structure
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].heading).toBe('personal')
      expect(result.entries[0].content).toHaveLength(3) // Three main bullet points

      // Test the main bullet points
      const [perfectionism, overthinking, fearOfJudgement] = result.entries[0].content

      // Test Perfectionism entry
      expect(perfectionism.text).toBe('Perfectionism')
      expect(perfectionism.type).toBe('thought')
      expect(perfectionism.tag).toBe('listItem')

      // Test Overthinking entry
      expect(overthinking.text).toBe('Overthinking, analysis paralysis, fear of failure')
      expect(overthinking.type).toBe('thought')
      expect(overthinking.subItems).toHaveLength(4)
      expect(overthinking.subItems?.map((item) => item.text)).toEqual([
        'decrease my playfulness.',
        'decreases poor decision-making',
        'decreases action-taking',
        'reinforces personal beliefs instead of increasing objective truth',
      ])

      // Test Fear of judgement entry
      expect(fearOfJudgement.text).toBe('Fear of judgement')
      expect(fearOfJudgement.type).toBe('thought')
      expect(fearOfJudgement.subItems).toHaveLength(2)
      expect(fearOfJudgement.subItems?.map((item) => item.text)).toEqual([
        'desire to be seen as correct instead of desire to be effective',
        'many judgments should be ignored because they lack sincerity',
      ])
    })
  })

  describe('processFileWithAst', () => {
    it('should read file and process its content', async () => {
      const fileContent = '# Test Heading\n\nTest content'
      vi.mocked(fs.readFile).mockResolvedValue(fileContent)

      const result = await processor.processFileWithAst('test.md')

      expect(fs.readFile).toHaveBeenCalledWith('test.md', 'utf-8')
      expect(result.entries.length).toBe(1)
      expect(result.entries[0].heading).toBe('Test Heading')
    })

    it('should throw an error for non-existent files', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => false,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } as any)

      await expect(processor.processFileWithAst('nonexistent.md')).rejects.toThrow('File not found')
    })
  })
})
