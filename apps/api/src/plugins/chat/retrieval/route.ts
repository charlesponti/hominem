import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import type { Document } from '@langchain/core/documents'
import { BytesOutputParser, StringOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import type { Message as VercelChatMessage } from 'ai'
import type { FastifyPluginAsync } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { supabaseClient } from '../../../lib/supabase'
import { openaiEmbeddings } from '../../../lib/openai'

const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent)
  return serializedDocs.join('\n\n')
}

const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === 'user') {
      return `Human: ${message.content}`
    }

    if (message.role === 'assistant') {
      return `Assistant: ${message.content}`
    }

    return `${message.role}: ${message.content}`
  })

  return formattedDialogueTurns.join('\n')
}

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`
const condenseQuestionPrompt = PromptTemplate.fromTemplate(CONDENSE_QUESTION_TEMPLATE)

const ANSWER_TEMPLATE = `You are an energetic talking puppy named Dana, and must answer all questions like a happy, talking dog would.
Use lots of puns!

Answer the question based only on the following context and chat history:
<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}
`
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE)

/**
 * This handler initializes and calls a retrieval chain. It composes the chain using
 * LangChain Expression Language. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#conversational-retrieval-chain
 */
const retrievalHandler: FastifyPluginAsync = async (server) => {
  server.post('/retrieval', async (request, reply) => {
    try {
      const body = request.body as { messages: VercelChatMessage[] }
      const messages = body.messages ?? []
      const previousMessages = messages.slice(0, -1)
      const currentMessageContent = messages[messages.length - 1].content

      const model = new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0.2,
      })

      const vectorstore = new SupabaseVectorStore(openaiEmbeddings, {
        client: supabaseClient,
        tableName: 'documents',
        queryName: 'match_documents',
      })

      /**
       * We use LangChain Expression Language to compose two chains.
       * To learn more, see the guide here:
       *
       * https://js.langchain.com/docs/guides/expression_language/cookbook
       *
       * You can also use the "createRetrievalChain" method with a
       * "historyAwareRetriever" to get something prebaked.
       */
      const standaloneQuestionChain = RunnableSequence.from([
        condenseQuestionPrompt,
        model,
        new StringOutputParser(),
      ])

      let resolveWithDocuments: (value: Document[]) => void
      const documentPromise = new Promise<Document[]>((resolve) => {
        resolveWithDocuments = resolve
      })

      const retriever = vectorstore.asRetriever({
        callbacks: [
          {
            handleRetrieverEnd(documents) {
              resolveWithDocuments(documents)
            },
          },
        ],
      })

      const retrievalChain = retriever.pipe(combineDocumentsFn)

      const answerChain = RunnableSequence.from([
        {
          context: RunnableSequence.from([(input) => input.question, retrievalChain]),
          chat_history: (input) => input.chat_history,
          question: (input) => input.question,
        },
        answerPrompt,
        model,
      ])

      const conversationalRetrievalQAChain = RunnableSequence.from([
        {
          question: standaloneQuestionChain,
          chat_history: (input) => input.chat_history,
        },
        answerChain,
        new BytesOutputParser(),
      ])

      const stream = await conversationalRetrievalQAChain.stream({
        question: currentMessageContent,
        chat_history: formatVercelMessages(previousMessages),
      })

      const documents = await documentPromise
      const serializedSources = Buffer.from(
        JSON.stringify(
          documents.map((doc) => {
            return {
              pageContent: `${doc.pageContent.slice(0, 50)}...`,
              metadata: doc.metadata,
            }
          })
        )
      ).toString('base64')

      reply.headers({
        'x-message-index': (previousMessages.length + 1).toString(),
        'x-sources': serializedSources,
      })

      return reply.send(stream)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      return reply.status(500).send({ error: 'Error retrieving information from the database' })
    }
  })
}

export default fastifyPlugin(retrievalHandler)
