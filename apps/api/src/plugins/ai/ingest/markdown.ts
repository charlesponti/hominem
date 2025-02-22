import type { FastifyPluginAsync } from 'fastify'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { createHash } from 'node:crypto'
import { HominemVectorStore } from '../../../lib/chromadb'

// Before running, follow set-up instructions at
// https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/supabase

/**
 * This handler takes input text, splits it into chunks, and embeds those chunks
 * into a vector store for later retrieval. See the following docs for more information:
 *
 * https://js.langchain.com/docs/modules/data_connection/document_transformers/text_splitters/recursive_text_splitter
 * https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/supabase
 */
export const MarkdownIngestPlugin: FastifyPluginAsync = async (server) => {
  server.post('/ingest/markdown', async (request, reply) => {
    const session = request.session.get('data')
    const { text } = request.body as { text: string }

    try {
      const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
        chunkSize: 256,
        chunkOverlap: 20,
      })

      const splitDocuments = await splitter.createDocuments([text])

      // 👇 Upload documents to vector store
      await HominemVectorStore.documentVectorStore.addDocuments(splitDocuments, {
        ids: [createHash('md5').update(text).digest('hex')],
      })

      return reply.send({ message: 'Markdown ingested successfully' })
    } catch (e) {
      console.error(e)
      return reply.code(500).send({ error: 'Failed to ingest markdown' })
    }
  })
}
