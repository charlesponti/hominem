// Regular expression for task detection
export const taskRegex = /^\s*(-|\*)\s*\[([ x])\]\s*/

/**
 * Normalizes whitespace in a string
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Detects if a text string represents a task
 */
export function detectTask(text: string): {
  isTask: boolean
  isComplete: boolean
  taskText: string | null
} {
  const match = text.match(taskRegex)
  if (!match) {
    return { isTask: false, isComplete: false, taskText: null }
  }

  const isComplete = match[2] === 'x'
  const taskText = text.replace(taskRegex, '').trim()

  return { isTask: true, isComplete, taskText }
}

/**
 * Extracts keys and values from JSON text
 */
export function extractKeysAndValues(jsonText: string) {
  try {
    const data = JSON.parse(jsonText)
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}