import nlp from 'compromise'
import { describe, expect, it } from 'vitest'
import { analyzeSentiment, getSentiment } from './sentiment-analysis'

describe('sentiment analysis', () => {
  describe('getSentiment', () => {
    describe('positive sentiment', () => {
      const positiveTexts = [
        'This is good',
        'I feel great about this',
        'I am so happy today',
        'I am excited about the future',
        'I love this product',
        'I really enjoy working here',
        'This is an excellent solution',
        'What a wonderful day',
        'This is fantastic news',
      ]

      for (const text of positiveTexts) {
        it(`should detect positive sentiment in "${text}"`, () => {
          const doc = nlp(text)
          expect(getSentiment(doc)).toBe('positive')
        })
      }
    })

    describe('negative sentiment', () => {
      const negativeTexts = [
        'I fear this might fail',
        'This is bad news',
        'I am sad about the results',
        'I am angry at this situation',
        'I am upset with the outcome',
        'I hate this interface',
        'This is terrible code',
        'What an awful meeting',
        'This is disappointing',
        'This is so annoying',
      ]

      for (const text of negativeTexts) {
        it(`should detect negative sentiment in "${text}"`, () => {
          const doc = nlp(text)
          expect(getSentiment(doc)).toBe('negative')
        })
      }
    })

    describe('neutral sentiment', () => {
      const neutralTexts = [
        'The sky is blue',
        'I am going to work',
        'This is a computer',
        'The meeting is at 2 PM',
        'I need to finish this task',
        'The document is ready',
        'Please review this code',
        'The system is running',
        'I will attend the meeting',
      ]

      for (const text of neutralTexts) {
        it(`should detect neutral sentiment in "${text}"`, () => {
          const doc = nlp(text)
          expect(getSentiment(doc)).toBe('neutral')
        })
      }
    })
  })

  describe('analyzeSentiment', () => {
    it('should provide detailed sentiment analysis for positive text', () => {
      const doc = nlp('I really love this amazing product')
      const analysis = analyzeSentiment(doc)

      expect(analysis.sentiment).toBe('positive')
      expect(analysis.score).toBeGreaterThan(0)
      expect(analysis.confidence).toBeGreaterThan(1)
    })

    it('should provide detailed sentiment analysis for negative text', () => {
      const doc = nlp('I absolutely hate this terrible product')
      const analysis = analyzeSentiment(doc)

      expect(analysis.sentiment).toBe('negative')
      expect(analysis.score).toBeLessThan(0)
      expect(analysis.confidence).toBeGreaterThan(1)
    })

    it('should handle negation correctly', () => {
      const doc = nlp('I do not like this product')
      const analysis = analyzeSentiment(doc)

      expect(analysis.sentiment).toBe('negative')
      expect(analysis.score).toBeLessThan(0)
    })

    it('should handle intensifiers correctly', () => {
      const doc = nlp('I really love this product')
      const analysis = analyzeSentiment(doc)
      const doc2 = nlp('I love this product')
      const analysis2 = analyzeSentiment(doc2)

      expect(analysis.score).toBeGreaterThan(analysis2.score)
    })

    it('should handle diminishers correctly', () => {
      const doc = nlp('I somewhat like this product')
      const analysis = analyzeSentiment(doc)
      const doc2 = nlp('I like this product')
      const analysis2 = analyzeSentiment(doc2)

      expect(analysis.score).toBeLessThan(analysis2.score)
    })

    describe('edge cases', () => {
      it('should handle empty text', () => {
        const doc = nlp('')
        const analysis = analyzeSentiment(doc)

        expect(analysis.sentiment).toBe('neutral')
        expect(analysis.score).toBe(0)
        expect(analysis.confidence).toBe(0)
      })

      it('should handle mixed sentiments', () => {
        const doc = nlp('I love this product but hate the price')
        const analysis = analyzeSentiment(doc)

        // The sentiment could be either positive or negative depending on the weights
        // but the confidence should be high since strong words are used
        expect(analysis.confidence).toBeGreaterThan(0.5)
      })

      it('should handle text with numbers and special characters', () => {
        const doc = nlp('The score is 10/10! Excellent performance!')
        const analysis = analyzeSentiment(doc)

        expect(analysis.sentiment).toBe('positive')
        expect(analysis.confidence).toBeGreaterThan(0)
      })

      it('should handle repeated words', () => {
        const doc = nlp('good good good')
        const analysis = analyzeSentiment(doc)

        expect(analysis.sentiment).toBe('positive')
        expect(analysis.confidence).toBeGreaterThan(0)
      })
    })
  })
})
