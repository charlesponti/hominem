import { OpenAI } from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'
import { WritingActions } from '../../../lib/writing'

const MODEL = 'gpt-4o-mini'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const WordDescriptionSchema = z.object({
  description: z.string().describe('The description of why the word should be avoided.'),
  other_words: z
    .array(z.string())
    .describe('List of unique words that are preferable to the provided word.'),
})

async function wordDescription(word: string) {
  const completion = await openai.beta.chat.completions.parse({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `Word:"${word}"`,
      },
    ],
    response_format: zodResponseFormat(WordDescriptionSchema, 'word_description'),
  })
  const { parsed } = completion.choices[0].message

  return parsed
}

interface WordRewriteParams {
  sentence: string
  word: string
}
async function wordRewrite({ sentence, word }: WordRewriteParams) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `Rewrite the following sentence to remove the word "${word}": ${sentence}`,
      },
    ],
  })

  return completion.choices[0].message.content
}

export async function POST(req: Request) {
  const { sentence, word, action } = (await req.json()) as {
    sentence: string
    word: string
    action: WritingActions
  }

  try {
    switch (action) {
      case WritingActions.DESCRIBE_WORD: {
        const result = await wordDescription(word)
        return Response.json({ result }, { status: 200 })
      }
      case WritingActions.REWRITE_SENTENCE: {
        const result = await wordRewrite({ sentence, word })
        return Response.json({ result }, { status: 200 })
      }
      default: {
        /**
         * The API should inform the user that the action they provided
         * is not supported. To improve usability and user experience, the
         * error object should provide the available actions.
         */
        return Response.json(
          {
            error: 'Invalid action',
            // Provide a list of available actions
            availableActions: Object.values(WritingActions),
          },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Error rewriting sentence' }, { status: 500 })
  }
}
