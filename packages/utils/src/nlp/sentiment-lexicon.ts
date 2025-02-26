interface SentimentWord {
  word: string
  score: number // -1.0 to 1.0
  strength: number // 0.0 to 1.0
}

interface SentimentPattern {
  pattern: string
  score: number
  strength: number
}

// Positive sentiment lexicon with scores and strengths
export const positiveLexicon: SentimentWord[] = [
  // Strong positive emotions (1.0)
  { word: 'love', score: 1.0, strength: 1.0 },
  { word: 'excellent', score: 1.0, strength: 1.0 },
  { word: 'amazing', score: 1.0, strength: 1.0 },
  { word: 'fantastic', score: 1.0, strength: 1.0 },
  { word: 'wonderful', score: 1.0, strength: 1.0 },

  // Moderate positive emotions (0.8)
  { word: 'great', score: 0.8, strength: 0.8 },
  { word: 'happy', score: 0.8, strength: 0.8 },
  { word: 'excited', score: 0.8, strength: 0.8 },
  { word: 'enjoy', score: 0.8, strength: 0.8 },

  // Light positive emotions (0.6)
  { word: 'good', score: 0.6, strength: 0.6 },
  { word: 'nice', score: 0.6, strength: 0.6 },
  { word: 'like', score: 0.6, strength: 0.6 },
  { word: 'pleased', score: 0.6, strength: 0.6 },
]

// Negative sentiment lexicon with scores and strengths
export const negativeLexicon: SentimentWord[] = [
  // Strong negative emotions (-1.0)
  { word: 'hate', score: -1.0, strength: 1.0 },
  { word: 'terrible', score: -1.0, strength: 1.0 },
  { word: 'awful', score: -1.0, strength: 1.0 },
  { word: 'horrible', score: -1.0, strength: 1.0 },

  // Moderate negative emotions (-0.8)
  { word: 'bad', score: -0.8, strength: 0.8 },
  { word: 'angry', score: -0.8, strength: 0.8 },
  { word: 'upset', score: -0.8, strength: 0.8 },
  { word: 'sad', score: -0.8, strength: 0.8 },

  // Light negative emotions (-0.6)
  { word: 'disappointing', score: -0.6, strength: 0.6 },
  { word: 'annoying', score: -0.6, strength: 0.6 },
  { word: 'dislike', score: -0.6, strength: 0.6 },
  { word: 'fear', score: -0.6, strength: 0.6 },
]

// Patterns that can modify sentiment
export const sentimentPatterns: SentimentPattern[] = [
  // Negation patterns
  { pattern: 'not', score: -1, strength: 1 }, // Inverts the sentiment
  { pattern: "n't", score: -1, strength: 1 },
  { pattern: 'never', score: -1, strength: 1 },

  // Intensifiers
  { pattern: 'very', score: 1, strength: 0.3 }, // Increases the strength by 30%
  { pattern: 'really', score: 1, strength: 0.3 },
  { pattern: 'extremely', score: 1, strength: 0.5 },
  { pattern: 'absolutely', score: 1, strength: 0.5 },

  // Diminishers
  { pattern: 'somewhat', score: 1, strength: -0.3 }, // Decreases the strength by 30%
  { pattern: 'slightly', score: 1, strength: -0.3 },
  { pattern: 'kind of', score: 1, strength: -0.3 },
  { pattern: 'sort of', score: 1, strength: -0.3 },
]

// Helper function to get sentiment score for a word
export function getWordSentiment(word: string): SentimentWord | undefined {
  return [...positiveLexicon, ...negativeLexicon].find(
    (item) => item.word.toLowerCase() === word.toLowerCase()
  )
}

// Helper function to get pattern modifiers
export function getPatternModifiers(text: string): SentimentPattern[] {
  return sentimentPatterns.filter((pattern) =>
    text.toLowerCase().includes(pattern.pattern.toLowerCase())
  )
}

// Export combined lexicon for easy access
export const fullLexicon = [...positiveLexicon, ...negativeLexicon]
