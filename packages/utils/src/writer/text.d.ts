export interface BulletPoint {
  text: string
  subPoints?: BulletPoint[]
}

export interface EnhancedBulletPoint extends BulletPoint {
  improvedText: string
  categories: string[]
}

declare module '*.md' {
  const content: string

  export default content
}

export interface NoteDetails {
  content: string
  dates?: {
    start: string
    end?: string
  }[]
  category?: string[]
  labels?: string[]
  people?: string[]
  place?: string
  date_time?: string
}
