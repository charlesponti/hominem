import type nlp from 'compromise'
import { getPatternModifiers, getWordSentiment } from './sentiment-lexicon'

export type Sentiment = 'positive' | 'negative' | 'neutral'

interface SentimentAnalysis {
  sentiment: Sentiment
  score: number // -1.0 to 1.0
  confidence: number // 0.0 to 1.0
}

export function getSentiment(doc: ReturnType<typeof nlp>): Sentiment {
  const analysis = analyzeSentiment(doc)
  return analysis.sentiment
}

export function analyzeSentiment(doc: ReturnType<typeof nlp>): SentimentAnalysis {
  const text = doc.out('text')
  const words = doc.terms().out('array')

  // Initialize sentiment metrics
  let totalScore = 0
  let totalStrength = 0
  let wordCount = 0

  // Get pattern modifiers from the full text
  const modifiers = getPatternModifiers(text)

  // Analyze each word
  for (const word of words) {
    const sentiment = getWordSentiment(word)
    if (sentiment) {
      let { score, strength } = sentiment

      // Apply modifiers
      for (const modifier of modifiers) {
        if (modifier.score < 0) {
          // Handle negation
          score *= -1
        }
        // Apply strength modifications
        strength = strength + modifier.strength
      }

      totalScore += score * strength
      totalStrength += strength
      wordCount++
    }
  }

  // Calculate final metrics
  const finalScore = wordCount > 0 ? totalScore / wordCount : 0
  const confidence = wordCount > 0 ? totalStrength / wordCount : 0

  // Determine sentiment category
  let sentiment: Sentiment = 'neutral'
  if (Math.abs(finalScore) < 0.2) {
    sentiment = 'neutral'
  } else if (finalScore > 0) {
    sentiment = 'positive'
  } else {
    sentiment = 'negative'
  }

  return {
    sentiment,
    score: finalScore,
    confidence,
  }
}
