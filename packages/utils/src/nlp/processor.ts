import { LLMProvider, type LLMProviderConfig } from '@hominem/ai'
import { generateObject } from 'ai'
import { z } from 'zod'
import {
  type ActionItems,
  ActionItemsSchema,
  type Decisions,
  DecisionsSchema,
  type Habits,
  HabitsSchema,
  type People,
  PeopleSchema,
  type TextAnalysis,
  type TextAnalysisEmotion,
  TextAnalysisEmotionSchema,
  TextAnalysisSchema,
} from '../schemas'

export class NLPProcessor {
  private config: LLMProviderConfig

  constructor(config?: LLMProviderConfig) {
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
