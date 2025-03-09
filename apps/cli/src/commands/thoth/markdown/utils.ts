import type nlp from 'compromise'

export function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export function detectTask(content: string): {
  isTask: boolean
  isComplete: boolean
  taskMatch: RegExpMatchArray | null
  taskText: string
} {
  // Check if this is a task item
  const taskMatch = content.match(/^\[([x ])\]\s*(.*)$/i)
  const isTask = taskMatch !== null
  const isComplete = isTask && taskMatch?.[1].toLowerCase() === 'x'
  const taskText = isTask && taskMatch?.[2] ? taskMatch[2] : content

  return { taskMatch, isTask, isComplete, taskText }
}

export function getContentType(doc: ReturnType<typeof nlp>, text: string, isTask: boolean): string {
  if (isTask) {
    return 'task'
  }

  if (doc.has('#PastTense+')) {
    return 'activity'
  }

  // Detect quotes
  if (/^".*"\s*-\s*.+/.test(text)) {
    return 'quote'
  }

  return 'thought'
}
