import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const factCheckerTool = tool({
  description: 'Checks the input for factual correctness',
  parameters: z.object({
    input: z.string(),
  }),
  async execute({ input }) {
    return `All facts seem correct. ${input}`
  },
})

const grammarCheckerTool = tool({
  description: 'Checks the input for spelling and grammatical errors',
  parameters: z.object({
    input: z.string(),
  }),
  async execute({ input }) {
    return `No errors found for ${input}`
  },
})

const sentimentAnalysisTool = tool({
  description: 'Analyzes the sentiment of the input text',
  parameters: z.object({
    input: z.string(),
  }),
  async execute({ input }) {
    return `Positive sentiment detected in ${input}`
  },
})

const factCheckerRoute: FastifyPluginAsync = async (server) => {
  server.post('/fact-check', async (request, reply) => {
    try {
      const body = request.body as { input: string }

      if (!body.input || typeof body.input !== 'string') {
        return Response.json({ error: 'Input must be a non-empty string' }, { status: 400 })
      }

      // Create a stream using the AI package
      const response = streamText({
        model: openai('gpt-4o-mini'),
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that analyzes text.' },
          { role: 'user', content: body.input },
        ],
        tools: {
          factCheckerTool,
          grammarCheckerTool,
          sentimentAnalysisTool,
        },
      })

      // Apply header to support streaming
      reply.header('Content-Type', 'application/octet-stream')

      // Send stream
      return reply.send(response)
    } catch (error) {
      console.error('Agent execution failed:', error)
      return reply.status(500).send({ error: 'Failed to process input' })
    }
  })
}
