export interface VectorDocumentInput {
  id: string
  content: string
  metadata: string | null
  embedding: number[]
  userId: string
  source: string
  sourceType: string
  createdAt: string
  updatedAt: string
}

export interface VectorDocumentOutput {
  id: string
  content: string
  metadata: string | null
  source: string | null
  sourceType: string | null
}
