import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import { ollama } from '../ai-models/ollama'

export const PeopleSchema = z.array(z.object({ firstName: z.string(), lastName: z.string() }))
export type People = z.infer<typeof PeopleSchema>

// Decisions Schema
export const DecisionsSchema = z
  .object({
    decisions: z.array(z.string()).describe('Decisions made in the text'),
    alternatives: z
      .array(z.string())
      .describe('Alternatives considered and other possible decisions'),
    reasoning: z.array(z.string()).describe('Reasoning behind the decisions'),
  })
  .optional()
export type Decisions = z.infer<typeof DecisionsSchema>

// Habits Schema
export const HabitsSchema = z
  .object({
    routines: z.array(z.string()),
    frequency: z.array(z.string()),
    timePatterns: z.array(z.string().describe('Time patterns in the cron format')),
  })
  .optional()
export type Habits = z.infer<typeof HabitsSchema>

export const ActionItemsSchema = z
  .object({
    todos: z.array(z.string()),
    commitments: z.array(z.string()),
    deadlines: z.array(z.string()),
  })
  .optional()
export type ActionItems = z.infer<typeof ActionItemsSchema>

export const TextAnalysisEmotionSchema = z.object({
  emotion: z.string(),
  intensity: z.number(),
})
export type TextAnalysisEmotion = z.infer<typeof TextAnalysisEmotionSchema>

const LocationSchema = z.object({
  name: z.string(),
  city: z.string(),
  state: z.string(),
  region: z.string(),
  country: z.string(),
  continent: z.string(),
})

export const TextAnalysisSchema = z.object({
  questions: z.array(z.string()).optional(),
  comparisons: z
    .array(z.array(z.string()))
    .optional()
    .describe(
      'Comparisons between items. Example output: [["item1", "item2", "item3"], ["item4", "item5"]'
    ),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
      })
    )
    .describe('Physical items mentioned in the text')
    .optional(),
  locations: z.array(LocationSchema).describe('Locations mentioned in the text').optional(),
  emotions: z.array(TextAnalysisEmotionSchema),
  people: z.array(z.string()).describe('People mentioned in the text'),
  activities: z.array(z.string()).describe('Activities mentioned in the text'),
  decisions: DecisionsSchema.optional(),
  habits: HabitsSchema.optional(),
  topics: z.array(z.string()).describe('Topics mentioned in the text'),
  timestamp: z
    .string()
    .describe('Timestamp of the analysis in ISO format, e.g. 2022-01-01T00:00:00Z'),
})
export type TextAnalysis = z.infer<typeof TextAnalysisSchema>

export interface NLPProcessorConfig {
  provider: 'openai' | 'ollama'
  model?: string
}

const DEFAULT_CONFIG: NLPProcessorConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
}

export class NLPProcessor {
  private config: NLPProcessorConfig
  private defaultOllamaModel = 'llama3.2'
  private defaultOpenaiModel = 'gpt-4o-mini'

  constructor(config: Partial<NLPProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  private getModel() {
    return this.config.provider === 'openai'
      ? openai(this.config.model || this.defaultOpenaiModel, { structuredOutputs: true })
      : ollama(this.config.model || this.defaultOllamaModel, { structuredOutputs: true })
  }

  async analyzeText(text: string): Promise<TextAnalysis> {
    const response = await generateObject({
      model: this.getModel(),
      prompt: `Analyze the following text and extract linguistic patterns, emotions, and topics: "${text}"`,
      schema: TextAnalysisSchema,
    })
    return response.object
  }

  async analyzeEmotionalJourney(text: string): Promise<TextAnalysisEmotion[]> {
    const response = await generateObject({
      model: this.getModel(),
      prompt: `Analyze the emotional journey in this text, breaking it down by sentences: "${text}"`,
      schema: z.array(TextAnalysisEmotionSchema),
    })
    return response.object
  }

  async findActionItems(text: string): Promise<ActionItems> {
    const response = await generateObject({
      model: this.getModel(),
      prompt: `Find action items, commitments, and deadlines in this text: "${text}"`,
      schema: ActionItemsSchema,
    })
    return response.object
  }

  async analyzePeople(text: string): Promise<People> {
    const response = await generateObject({
      model: this.getModel(),
      prompt: `Return the people mentioned in the following text: "${text}"`,
      schema: PeopleSchema,
    })
    return response.object
  }

  async analyzeDecisions(text: string): Promise<Decisions> {
    const response = await generateObject({
      model: this.getModel(),
      prompt: `Analyze decisions, alternatives, and reasoning in this text: "${text}"`,
      schema: DecisionsSchema,
    })
    return response.object
  }

  async analyzeHabits(text: string): Promise<Habits> {
    const response = await generateObject({
      model: this.getModel(),
      prompt: `Analyze habits, routines, and time patterns in this text: "${text}"`,
      schema: HabitsSchema,
    })
    return response.object
  }
}
