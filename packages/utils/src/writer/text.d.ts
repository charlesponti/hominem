export interface BulletPoint {
  text: string
  subPoints?: BulletPoint[]
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
