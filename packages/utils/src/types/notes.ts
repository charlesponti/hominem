export interface Note {
  id: string
  content: string
  title?: string
  createdAt: Date
  updatedAt?: Date
}

export interface NoteTag {
  noteId: string
  tagId: string
}

export interface BulletPoint {
  text: string
  subPoints?: BulletPoint[]
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
