import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '@hominem/utils/logger'

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

    // Format context as XML
    let contextValues = ''
    if (context && Object.keys(context).length > 0) {
      const xmlContext = Object.entries(context)
        .map(([key, value]) => `<${key}>${value}</${key}>`)
        .join('\n')
      contextValues = `\n\n${xmlContext}`
    }

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
      logger.error(`Failed to load prompt '${fileName}':`, { error })
      return DEFAULT_PROMPT
    }
  }

  /**
   * Clear the cache to reload prompts from disk
   */
  clearCache() {
    this.cache.clear()
  }
}

// Export singleton instance
const promptsDir = path.join(__dirname, '..', 'prompts')
export const promptService = new PromptService(promptsDir)
