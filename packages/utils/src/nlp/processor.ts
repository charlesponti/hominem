import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

export const ActionItemsSchema = z.object({
  todos: z.array(z.string()),
  commitments: z.array(z.string()),
  deadlines: z.array(z.string()),
})
export type ActionItems = z.infer<typeof ActionItemsSchema>

export const TextAnalysisEmotionSchema = z.object({
  emotion: z.string(),
  intensity: z.number(),
})
export type TextAnalysisEmotion = z.infer<typeof TextAnalysisEmotionSchema>

export const TextAnalysisSchema = z.object({
  verbs: z.object({
    future: z.array(z.string()),
    past: z.array(z.string()),
    present: z.array(z.string()),
  }),
  questions: z.array(z.string()),
  conditions: z.array(z.string()),
  comparisons: z.array(z.string()),
  quantities: z.array(z.string()),
  emphasis: z.array(z.string()),
  emotion: z.array(TextAnalysisEmotionSchema),
  topics: z.object({
    tech: z.array(z.string()),
    personal: z.array(z.string()),
    work: z.array(z.string()),
  }),
})
export type TextAnalysis = z.infer<typeof TextAnalysisSchema>

export class EnhancedNLPProcessor {
  async analyzeText(text: string): Promise<TextAnalysis> {
    const response = await generateObject({
      model: openai('gpt-4-mini', { structuredOutputs: true }),
      prompt: `Analyze the following text and extract linguistic patterns, emotions, and topics: "${text}"`,
      schema: TextAnalysisSchema,
    })

    return response.object
  }

  async analyzeEmotionalJourney(text: string): Promise<TextAnalysisEmotion[]> {
    const response = await generateObject({
      model: openai('gpt-4-mini', { structuredOutputs: true }),
      prompt: `Analyze the emotional journey in this text, breaking it down by sentences: "${text}"`,
      schema: z.array(TextAnalysisEmotionSchema),
    })
    return response.object
  }

  async findActionItems(
    text: string
  ): Promise<{ todos: string[]; commitments: string[]; deadlines: string[] }> {
    const response = await generateObject({
      model: openai('gpt-4-mini', { structuredOutputs: true }),
      prompt: `Find action items, commitments, and deadlines in this text: "${text}"`,
      schema: ActionItemsSchema,
    })
    return response.object
  }

  async analyzeSocialInteractions(text: string) {
    const response = await generateObject({
      model: openai('gpt-4-mini', { structuredOutputs: true }),
      prompt: `Analyze social interactions, mentioned people, and communications in this text: "${text}"`,
      schema: z.object({
        people: z.array(z.string()),
        activities: z.array(z.string()),
        communications: z.array(z.string()),
      }),
    })
    return response.object
  }

  async analyzeDecisions(text: string) {
    const response = await generateObject({
      model: openai('gpt-4-mini', { structuredOutputs: true }),
      prompt: `Analyze decisions, alternatives, and reasoning in this text: "${text}"`,
      schema: z.object({
        decisions: z.array(z.string()),
        alternatives: z.array(z.string()),
        reasoning: z.array(z.string()),
      }),
    })
    return response.object
  }

  async analyzeHabits(text: string) {
    const response = await generateObject({
      model: openai('gpt-4-mini', { structuredOutputs: true }),
      prompt: `Analyze habits, routines, and time patterns in this text: "${text}"`,
      schema: z.object({
        routines: z.array(z.string()),
        frequency: z.array(z.string()),
        timePatterns: z.array(z.string()),
      }),
    })
    return response.object
  }
}
