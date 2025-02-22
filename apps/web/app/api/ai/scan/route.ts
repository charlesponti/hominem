import { HumanMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { MemorySaver } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

const factCheckerTool = tool(
  async ({ input }: { input: string }): Promise<string> => {
    return `All facts seem correct. ${input}`
  },
  {
    name: 'fact-checker',
    description: 'Checks the input for factual correctness',
    schema: z.object({
      input: z.string(),
    }),
  }
)

const grammarCheckerTool = tool(
  async ({ input }: { input: string }): Promise<string> => {
    return `No errors found for ${input}`
  },
  {
    name: 'grammar-checker',
    description: 'Checks the input for spelling and grammatical errors',
    schema: z.object({
      input: z.string(),
    }),
  }
)

const sentimentAnalysisTool = tool(
  async ({ input }: { input: string }): Promise<string> => {
    return `Positive sentiment detected in ${input}`
  },
  {
    name: 'sentiment-analysis',
    description: 'Analyzes the sentiment of the input text',
    schema: z.object({
      input: z.string(),
    }),
  }
)

const tools = [factCheckerTool, grammarCheckerTool, sentimentAnalysisTool]

// Initialize memory to persist state between graph runs
const checkpointer = new MemorySaver()

const model = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  streaming: true,
})

const app = createReactAgent({
  llm: model,
  tools,
  checkpointSaver: checkpointer,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.input || typeof body.input !== 'string') {
      return Response.json({ error: 'Input must be a non-empty string' }, { status: 400 })
    }

    const response = await app.invoke(
      {
        messages: [new HumanMessage(body.input)],
      },
      { configurable: { thread_id: '42' } }
    )

    return Response.json(response)
  } catch (error) {
    console.error('Agent execution failed:', error)
    return Response.json({ error: 'Failed to process input' }, { status: 500 })
  }
}
