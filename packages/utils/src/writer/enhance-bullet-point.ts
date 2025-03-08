import { ollama } from '@/ai-models/ollama'
import type { BulletPoint } from '@/types/notes'
import { generateObject } from 'ai'
import { z } from 'zod'

const EnhancedBulletPointSchema = z.object({
  improvedText: z.string(),
  categories: z.array(z.string()),
})
type EnhancedBulletPoint = z.infer<typeof EnhancedBulletPointSchema>

export async function enhanceBulletPoint(
  content: string,
  model = 'llama3.2'
): Promise<EnhancedBulletPoint> {
  const response = await generateObject({
    model: ollama(model),
    prompt: `
      <|start_header_id|>system<|end_header_id|>
      You are an AI designed to analyze user thoughts like a therapist would. Your responses should be concise, action-oriented, and supportive.

      Primary Function:
        •	For each thought the user provides, analyze it as a therapist would.
        •	If the thought describes a problem, respond with a single actionable step the user can take.
        •	If the thought is an opinion, provide a liberal, empathetic, and positive alternative without dismissing the user’s perspective.

      Additional Actions:
        1.	Pattern Recognition: Identify recurring themes in the user's thoughts and gently highlight them.
        2.	Encouragement: Offer reinforcement when the user expresses progress or effort.
        3.	Reframing Negativity: If a thought is self-critical or overly negative, provide a more compassionate interpretation.
        4.	Motivation & Momentum: If a thought suggests indecision or hesitation, provide a nudge toward action.
        5.	Mindfulness & Perspective: If a thought is anxiety-driven, encourage grounding techniques or a broader perspective.
        6.	Balancing Logic & Emotion: If the thought is highly emotional, acknowledge the feelings while introducing rational balance.
        7.	Avoid Toxic Positivity: Be uplifting but realistic—don't dismiss pain or struggle with forced optimism.
      
      <|eot_id|><|start_header_id|>user<|end_header_id|>
      ${content}
      <|eot_id|><|start_header_id|>assistant<|end_header_id|>
    `,
    schema: EnhancedBulletPointSchema,
  })

  return response.object
}

export async function enhanceBulletPoints(
  bullets: BulletPoint[],
  onProgress?: (current: number, total: number) => void
): Promise<EnhancedBulletPoint[]> {
  const enhanced: EnhancedBulletPoint[] = []

  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i]

    if (!bullet) {
      continue
    }

    try {
      const { improvedText, categories } = await enhanceBulletPoint(bullet.text)
      enhanced.push({
        ...bullet,
        improvedText,
        categories,
      })

      if (onProgress) {
        onProgress(i + 1, bullets.length)
      }
    } catch (error) {
      console.error(`Error processing bullet: ${bullet.text}`, error)
      // Keep original text if enhancement fails
      enhanced.push({
        ...bullet,
        improvedText: bullet.text,
        categories: [],
      })
    }

    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return enhanced
}
