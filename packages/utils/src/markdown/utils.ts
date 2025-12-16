export const taskRegex = /^(\s*[-*]\s*)?(\[[x ]\])/i

export function detectTask(text: string) {
  const taskMatch = text.match(taskRegex)
  if (!taskMatch || !taskMatch[2]) return { isTask: false, isComplete: false, taskText: null }

  const isComplete = taskMatch[2].toLowerCase() === '[x]'
  const taskText = text.replace(taskRegex, '').trim()

  return {
    isTask: true,
    isComplete,
    taskText,
  }
}

export function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
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
