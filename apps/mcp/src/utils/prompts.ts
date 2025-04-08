import fs from 'node:fs'
import path from 'node:path'

/**
 * Load and process a prompt template from the prompts directory
 *
 * @param name - The name of the prompt file (without extension)
 * @param variables - Object containing variables to substitute in the template
 * @returns Processed prompt string with variables substituted
 */
export function loadPrompt(name: string, variables: Record<string, string> = {}): string {
  try {
    const promptsDir = path.join(__dirname, '..', 'prompts')
    const filePath = path.join(promptsDir, `${name}.md`)

    let promptTemplate = fs.readFileSync(filePath, 'utf8')

    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g')
      let replacement = ''

      if (Array.isArray(value)) {
        replacement = value.join(', ') || 'None specified'
      } else if (value !== undefined && value !== null) {
        replacement = String(value)
      }

      promptTemplate = promptTemplate.replace(placeholder, replacement)
    }

    return promptTemplate
  } catch (error) {
    console.error(`Error loading prompt '${name}':`, error)
    return `Failed to load prompt '${name}'`
  }
}
