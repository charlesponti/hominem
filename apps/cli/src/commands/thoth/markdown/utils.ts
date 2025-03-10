export function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export const taskRegex = /^\[([x ])\]\s*(.*)$/i

export function detectTask(content: string): {
  isTask: boolean
  isComplete: boolean
  taskMatch: RegExpMatchArray | null
  taskText: string
} {
  // Check if this is a task item
  const taskMatch = content.match(taskRegex)
  const isTask = taskMatch !== null
  const isComplete = isTask && taskMatch?.[1].toLowerCase() === 'x'
  const taskText = isTask && taskMatch?.[2] ? taskMatch[2] : content

  return { taskMatch, isTask, isComplete, taskText }
}
