import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import { ChromaClient } from 'chromadb'

export const CHROMA_URL = process.env.CHROMA_URL

export namespace HominemVectorStore {
  const imageCollectionName = 'images'
  const documentCollectionName = 'documents'

  export const chromaClient = new ChromaClient()

  export const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  })

  export const imageVectorStore = new Chroma(embeddings, {
    collectionName: imageCollectionName,
    url: CHROMA_URL,
    // Optional: Used to specify the distance method of the embedding space.
    // [Docs](https://docs.trychroma.com/usage-guide#changing-the-distance-function)
    collectionMetadata: {
      'hnsw:space': 'cosine',
    },
  })

  export const documentVectorStore = new Chroma(embeddings, {
    collectionName: documentCollectionName,
    url: CHROMA_URL,
    // Optional: Used to specify the distance method of the embedding space.
    // [Docs](https://docs.trychroma.com/usage-guide#changing-the-distance-function)
    collectionMetadata: {
      'hnsw:space': 'cosine',
    },
  })

  export const imageCollection = imageVectorStore.collection

  export const documentCollection = documentVectorStore.collection

  export type VectorEmbeddings = OpenAIEmbeddings
}
