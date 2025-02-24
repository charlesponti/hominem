export interface Note {
  file: string
  heading?: string
  text: string
  tag?: string
  date?: string
}

export interface DateFromText {
  fullDate?: string
  year?: string
}

export interface ProcessedContent {
  headings: { text: string; tag: 'heading' }[]
  paragraphs: Note[]
  bulletPoints: Note[]
  others: Note[]
}
