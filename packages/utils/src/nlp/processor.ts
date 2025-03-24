import { generateObject } from 'ai'
import { z } from 'zod'
import { LLMProvider, type LLMProviderConfig } from '../ai/llm.provider'

export const PersonSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string().nullable(),
    fullName: z.string().describe('Name of the person'),
    role: z.string().describe('Role of the person in the context'),
  })
  .describe('people mentioned in the text')
export const PeopleSchema = z.array(PersonSchema)
export type People = z.infer<typeof PeopleSchema>

// Event Schema
export const EventSchema = z
  .array(
    z.object({
      type: z.string().describe('Type of event'),
      description: z.string().describe('Description of the event'),
      raw: z.string().describe('Raw event content'),
      timestamp: z.string().nullable(),
    })
  )
  .describe('Activity mentioned in the text')
export const ActivitiesSchema = z.array(EventSchema)

export const ThoughtsSchema = z
  .array(
    z.object({
      type: z.string().describe('Type of thought'),
      description: z.string().describe('the thought mentioned'),
    })
  )
  .describe('thoughts that the person had')

// Decisions Schema
export const DecisionsSchema = z.object({
  decision: z.array(z.string()).describe('Decision made in the text'),
  alternatives: z.array(z.string()).describe('possible positive alternatives'),
  reasoning: z.array(z.string()).describe('Reasoning behind the decision'),
  context: z.string().describe('Context in which the decision was made'),
})
export type Decisions = z.infer<typeof DecisionsSchema>

// Habits Schema
export const HabitsSchema = z.object({
  routines: z.array(z.string()),
  frequency: z.array(z.string()),
  timePatterns: z.array(z.string().describe('Time patterns in the cron format')),
  triggers: z.array(z.string()).describe('Triggers for the habits'),
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
export const LocationsSchema = z.array(LocationSchema).describe('Locations mentioned in the text')

export const TimestampSchema = z
  .string()
  .describe('Timestamp of the analysis in ISO format, e.g. 2022-01-01T00:00:00Z')

export const comparisonsSchema = z
  .array(z.array(z.string()))
  .describe(
    'Comparisons between items. Example output: [["item1", "item2", "item3"], ["item4", "item5"]'
  )

export const TextAnalysisSchema = z.object({
  questions: z.array(z.string()).nullable(),
  // items: z
  //   .array(
  //     z.object({
  //       name: z.string(),
  //       quantity: z.number(),
  //     })
  //   )
  //   .describe('Physical items mentioned in the text')
  //   .nullable(),
  locations: LocationsSchema.nullable(),
  emotions: z.array(TextAnalysisEmotionSchema).nullable(),
  people: PeopleSchema,
  activities: ActivitiesSchema.nullable(),
  decisions: DecisionsSchema.nullable(),
  topics: z.array(z.string()).describe('Topics mentioned in the text'),
  timestamp: TimestampSchema.nullable(),
})
export type TextAnalysis = z.infer<typeof TextAnalysisSchema>

export class NLPProcessor {
  private config: LLMProviderConfig

  constructor(config: LLMProviderConfig) {
    this.config = config || {
      provider: 'google',
      model: 'gemini-1.5-flash-latest',
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
