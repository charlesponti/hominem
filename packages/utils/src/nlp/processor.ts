import { generateObject } from 'ai'
import { z } from 'zod'
import { LLMProvider, type LLMProviderConfig } from '../ai/llm.provider'

export const PeopleSchema = z.array(z.object({ firstName: z.string(), lastName: z.string() }))
export type People = z.infer<typeof PeopleSchema>

// Decisions Schema
export const DecisionsSchema = z.object({
  decisions: z.array(z.string()).describe('Decisions made in the text'),
  alternatives: z
    .array(z.string())
    .describe('Alternatives considered and other possible decisions'),
  reasoning: z.array(z.string()).describe('Reasoning behind the decisions'),
})
export type Decisions = z.infer<typeof DecisionsSchema>

// Habits Schema
export const HabitsSchema = z.object({
  routines: z.array(z.string()),
  frequency: z.array(z.string()),
  timePatterns: z.array(z.string().describe('Time patterns in the cron format')),
})
export type Habits = z.infer<typeof HabitsSchema>

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

export const LocationSchema = z.object({
  name: z.string().describe('Specific name of the location (e.g., "Eiffel Tower", "Central Park")'),
  city: z.string().describe('City where the location is situated (e.g., "Paris", "New York")'),
  state: z.string().describe('State or province of the location (e.g., "California", "Ontario")'),
  region: z
    .string()
    .describe('Broader geographical region (e.g., "Midwest", "Alps", "Silicon Valley")'),
  country: z.string().describe('Full country name (e.g., "United States", "Japan")'),
  continent: z
    .string()
    .describe('One of seven continents (e.g., "Europe", "North America", "Asia")'),
})

const comparisonsSchema = z
  .array(z.array(z.string()))
  .nullable()
  .describe(
    'Comparisons between items. Example output: [["item1", "item2", "item3"], ["item4", "item5"]'
  )

export const TextAnalysisSchema = z.object({
  questions: z.array(z.string()).nullable(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
      })
    )
    .describe('Physical items mentioned in the text')
    .nullable(),
  locations: z.array(LocationSchema).describe('Locations mentioned in the text').nullable(),
  emotions: z.array(TextAnalysisEmotionSchema).nullable().default([]),
  people: z.array(z.string()).describe('People mentioned in the text').nullable().default([]),
  activities: z
    .array(z.string())
    .describe('Activities mentioned in the text')
    .nullable()
    .default([]),
  decisions: DecisionsSchema.nullable(),
  habits: HabitsSchema.nullable(),
  topics: z.array(z.string()).describe('Topics mentioned in the text'),
  timestamp: z
    .string()
    .describe('Timestamp of the analysis in ISO format, e.g. 2022-01-01T00:00:00Z'),
})
export type TextAnalysis = z.infer<typeof TextAnalysisSchema>

export class NLPProcessor {
  private config: LLMProviderConfig

  constructor(config: LLMProviderConfig) {
    this.config = config || {
      provider: 'openai',
      model: 'gpt-4o-mini',
    }
  }

  async analyzeText(text: string): Promise<TextAnalysis> {
    const llmProvider = new LLMProvider(this.config)
    const response = await generateObject({
      model: llmProvider.getModel(),
      prompt: `Analyze the following text and extract linguistic patterns, emotions, and topics: "${text}"`,
      schema: TextAnalysisSchema,
    })
    return response.object
  }

  async analyzeEmotion(text: string): Promise<TextAnalysisEmotion[]> {
    const llmProvider = new LLMProvider(this.config)
    const response = await generateObject({
      model: llmProvider.getModel(),
      prompt: `Analyze the emotional journey in this text, breaking it down by sentences: "${text}"`,
      schema: z.array(TextAnalysisEmotionSchema),
    })
    return response.object
  }

  async findActionItems(text: string): Promise<ActionItems> {
    const llmProvider = new LLMProvider(this.config)
    const response = await generateObject({
      model: llmProvider.getModel(),
      prompt: `Find action items, commitments, and deadlines in this text: "${text}"`,
      schema: ActionItemsSchema,
    })
    return response.object
  }

  async analyzePeople(text: string): Promise<People> {
    const llmProvider = new LLMProvider(this.config)
    const response = await generateObject({
      model: llmProvider.getModel(),
      prompt: `Return the people mentioned in the following text: "${text}"`,
      schema: PeopleSchema,
    })
    return response.object
  }

  async analyzeDecisions(text: string): Promise<Decisions> {
    const llmProvider = new LLMProvider(this.config)
    const response = await generateObject({
      model: llmProvider.getModel(),
      prompt: `Analyze decisions, alternatives, and reasoning in this text: "${text}"`,
      schema: DecisionsSchema,
    })
    return response.object
  }

  async analyzeHabits(text: string): Promise<Habits> {
    const llmProvider = new LLMProvider(this.config)
    const response = await generateObject({
      model: llmProvider.getModel(),
      prompt: `Analyze habits, routines, and time patterns in this text: "${text}"`,
      schema: HabitsSchema,
    })
    return response.object
  }
}
