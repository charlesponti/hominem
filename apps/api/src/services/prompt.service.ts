import { logger } from '@hominem/utils/logger'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Service for loading and managing prompts stored as markdown files
 */
export class PromptService {
  private promptsDir: string
  private cache: Map<string, string> = new Map()

  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir || path.join(__dirname, '..', 'prompts')
  }

  /**
   * Load a prompt from a markdown file
   * @param fileName - Name of the prompt file (without .md extension)
   * @param context - Optional context to replace in the prompt
   * @returns The prompt text or null if not found
   */
  async getPrompt(
    fileName: 'assistant' | 'chat',
    context?: Record<string, string>
  ): Promise<string> {
    const DEFAULT_PROMPT =
      'You are a helpful AI assistant. Answer questions to the best of your ability.'
    const contextValues = context ? `\n\nContext: ${JSON.stringify(context)}` : ''
    let content: string
    try {
      // Check cache first
      if (this.cache.has(fileName)) {
        content = this.cache.get(fileName) || DEFAULT_PROMPT
        return `${content} ${contextValues}`
      }

      const filePath = path.join(this.promptsDir, `${fileName}.md`)
      content = await fs.promises.readFile(filePath, 'utf-8')

      // Store in cache. Do not include context in cache as it is dynamic.
      this.cache.set(fileName, content)

      return `${content}${contextValues}`
    } catch (error) {
      logger.error(`Failed to load prompt '${fileName}':`, error)
      return DEFAULT_PROMPT
    }
  }

  /**
   * Clear the cache to reload prompts from disk
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
const promptsDir = path.join(__dirname, '..', 'prompts')
export const promptService = new PromptService(promptsDir)
