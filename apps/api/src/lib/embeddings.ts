import { Document } from '@langchain/core/documents'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import logger from '../logger'
import { HominemVectorStore } from './chromadb'

class Embedder {
  private embeddings: HominemVectorStore.VectorEmbeddings

  constructor() {
    this.embeddings = HominemVectorStore.embeddings
  }

  async getImageEmbedding(image: File): Promise<number[]> {
    try {
      const buffer = await image.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const embeddingResponse = await this.embeddings.embedQuery(base64)
      return embeddingResponse
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  async getEmbeddingsFromImage(imagePath: string): Promise<number[]> {
    try {
      const imageBuffer = await fs.readFile(imagePath)
      const base64 = imageBuffer.toString('base64')
      const embeddingResponse = await this.embeddings.embedQuery(base64)
      return embeddingResponse
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  async embedFromBuffer(buffer: Buffer): Promise<{
    id: string
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    metadata: { [key: string]: any }
    values: number[]
  }> {
    try {
      const base64 = buffer.toString('base64')
      const embeddings = await this.embeddings.embedQuery(base64)

      await HominemVectorStore.imageVectorStore.addVectors(
        [embeddings],
        [
          new Document({
            pageContent: buffer.toString('base64'),
            metadata: {},
          }),
        ]
      )

      const id = createHash('md5').update(buffer.toString('base64')).digest('hex')

      return {
        id,
        metadata: {},
        values: embeddings,
      }
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  async embed(
    imagePath: string,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    metadata?: { [key: string]: any }
  ): Promise<{
    id: string
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    metadata: { [key: string]: any }
    values: number[]
  }> {
    try {
      const embeddings = await this.getEmbeddingsFromImage(imagePath)

      await HominemVectorStore.imageVectorStore.addVectors(
        [embeddings],
        [new Document({ pageContent: imagePath, metadata: metadata })]
      )

      const id = createHash('md5').update(imagePath).digest('hex')

      return {
        id,
        metadata: metadata || {
          imagePath,
        },
        values: embeddings,
      }
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }
}

const embedder = new Embedder()
export { embedder }
