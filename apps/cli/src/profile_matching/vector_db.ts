import assert from 'node:assert'
import { Pinecone } from '@pinecone-database/pinecone'

const { PINECONE_API_KEY } = process.env

assert(PINECONE_API_KEY, 'Missing PINECONE_API_KEY')

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
  maxRetries: 3,
})

const INDEX_NAME = 'sy-collab-profiles'

export async function upsertProfile(id: string, embedding: number[]) {
  const index = pinecone.Index(INDEX_NAME)

  return await index.upsert([
    {
      id: id,
      values: embedding,
    },
  ])
}

export async function query(vector: number[], limit: number) {
  const index = pinecone.Index(INDEX_NAME)

  return await index.query({
    vector,
    topK: limit,
    includeValues: true,
    includeMetadata: true,
  })
}
