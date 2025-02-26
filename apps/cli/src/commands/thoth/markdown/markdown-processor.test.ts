import { describe, expect, it } from 'vitest'
import { MarkdownProcessor } from './markdown-processor'

describe('MarkdownProcessor', () => {
  describe('convertMarkdownToJSON', () => {
    it('should correctly process hierarchical lists with personal reflections', async () => {
      const processor = new MarkdownProcessor()
      const markdown = `## personal
- **Perfectionism**
- **Overthinking, analysis paralysis, fear of failure**
  - decrease my playfulness.
  - decreases poor decision-making
  - decreases action-taking
  - reinforces personal beliefs instead of increasing objective truth
- **Fear of judgement**
  - desire to be seen as correct instead of desire to be effective
  - many judgements should be ignored because they lack sincerity`

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
        'many judgements should be ignored because they lack sincerity',
      ])

      // Test metadata and sentiment analysis
      expect(overthinking.sentiment).toBe('negative')
      expect(fearOfJudgement.sentiment).toBe('negative')
    })
  })
})
