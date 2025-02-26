import type { DateFromText } from './types.ts'

export function getDateFromText(text: string): DateFromText {
  const fullDate = text.match(/\d{4}-\d{2}-\d{2}/)
  const year = text.match(/(?<![\d.])\d{4}(?![\d.])/)

  return {
    fullDate: fullDate?.[0],
    year: year?.[0],
  }
}

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

export function detectDream(strings: string[]): boolean {
  const content = strings.join(' ').toLowerCase()

  return (
    content.includes('dream:') ||
    content.includes('dream -') ||
    content.includes('dream') ||
    content.includes('I dreamed') ||
    content.includes('my dream')
  )
}
