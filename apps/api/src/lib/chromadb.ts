import { ChromaClient, IncludeEnum, OpenAIEmbeddingFunction } from 'chromadb'
import logger from 'src/logger'

const embeddingFunction = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
  openai_model: 'text-embedding-3-small',
})

export namespace HominemVectorStore {
  const imageCollectionName = 'images'
  const documentCollectionName = 'documents'

  export const chroma = new ChromaClient()

  async function getDocumentCollection() {
    return chroma.getOrCreateCollection({
      name: documentCollectionName,
      embeddingFunction,
    })
  }

  export const imageCollection = chroma.getOrCreateCollection({
    name: imageCollectionName,
    embeddingFunction,
  })

  export async function upsertProfile(id: string, profile: string) {
    const collection = await chroma.getOrCreateCollection({
      name: 'profiles',
      embeddingFunction,
    })

    await collection.add({
      documents: [profile],
      ids: [id],
      metadatas: [{ id }],
    })

    return { count: 1 }
  }

  export async function upsertBatch(
    indexName: string,
    documents: Array<{ id: string; document: string; metadata?: Record<string, string | number> }>
  ) {
    try {
      const collection = await chroma.getOrCreateCollection({
        name: indexName,
        embeddingFunction,
      })

      await collection.add({
        documents: documents.map((v) => v.document),
        ids: documents.map((v) => v.id),
        metadatas: documents.map((v) => v.metadata || {}),
      })

      return { count: documents.length }
    } catch (error) {
      logger.error(error)
      throw new Error(`Failed to upsert batch: ${(error as Error)?.message}`)
    }
  }

  export async function query({
    q,
    indexName,
    limit,
  }: {
    q: string
    indexName: string
    limit: number
  }) {
    const collection = await chroma.getCollection({
      name: indexName,
      embeddingFunction,
    })

    const queryResults = await collection.query({
      nResults: limit,
      queryTexts: [q],
      include: [IncludeEnum.Distances, IncludeEnum.Metadatas, IncludeEnum.Documents],
    })
    const results = []

    // Transform to match the expected format for compatibility
    for (let i = 0; i < queryResults.ids.length; i++) {
      results.push({
        id: queryResults.ids[i],
        score: queryResults.distances?.[i],
        metadata: queryResults.metadatas[i],
        document: queryResults.documents[i],
      })
    }

    return { results }
  }
}
