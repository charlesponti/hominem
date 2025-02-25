import nlp from 'compromise'

export interface EmotionalJourney {
  text: string
  emotion: string
  intensity: number
}

export interface NLPAnalysis {
  verbs: {
    future: string[] // Planning to do
    past: string[] // Already done
    present: string[] // Currently doing
  }
  questions: string[] // Questions asked
  conditions: string[] // "if/then" statements
  comparisons: string[] // Comparisons made
  quantities: string[] // Numbers and amounts
  emphasis: string[] // Strongly emphasized statements
  topics: {
    // Topic categorization
    tech: string[]
    personal: string[]
    work: string[]
    // etc
  }
}

export class EnhancedNLPProcessor {
  analyzeText(text: string): NLPAnalysis {
    const doc = nlp(text)

    return {
      // Find all verbs by tense
      verbs: {
        future: doc.match('#Verb').if('#Future').out('array'),
        past: doc.match('#Verb').if('#PastTense').out('array'),
        present: doc.match('#Verb').if('#PresentTense').out('array'),
      },

      // Find all questions asked
      questions: doc.questions().out('array'),

      // Find conditional statements
      conditions: doc
        .match('if * then *')
        .concat(doc.match('unless *'))
        .concat(doc.match('* would *'))
        .out('array'),

      // Find comparisons
      comparisons: doc.match('* (better|worse|more|less|greater|smaller) than *').out('array'),

      // Find quantities and measurements
      quantities: doc.numbers().concat(doc.match('#Value #Unit')).out('array'),

      // Find emphasized statements
      emphasis: doc.match('(really|very|absolutely|definitely|extremely) *').out('array'),

      // Categorize topics
      topics: {
        tech: doc.match('(computer|software|code|program|app|website) *').out('array'),
        personal: doc.match('(feel|think|believe|want|need) *').out('array'),
        work: doc.match('(meeting|project|deadline|client|work) *').out('array'),
      },
    }
  }

  private detectEmotion(sentence: ReturnType<typeof nlp>): string {
    const text = sentence.out('text')
    // Basic emotion detection based on keywords
    if (/(happy|joy|excited|wonderful|great|love)/i.test(text)) return 'joy'
    if (/(sad|depressed|unhappy|miserable)/i.test(text)) return 'sadness'
    if (/(angry|mad|furious|annoyed)/i.test(text)) return 'anger'
    if (/(afraid|scared|worried|anxious)/i.test(text)) return 'fear'
    if (/(surprised|amazed|astonished)/i.test(text)) return 'surprise'
    return 'neutral'
  }

  private measureIntensity(sentence: ReturnType<typeof nlp>): number {
    // Count intensity modifiers and exclamations
    const intensifierCount = sentence.match(
      '(very|really|extremely|absolutely|totally|completely)'
    ).length
    const exclamationCount = (sentence.out('text').match(/!/g) || []).length

    // Base intensity is 1, each intensifier adds 0.2, each exclamation adds 0.1
    return 1 + intensifierCount * 0.2 + exclamationCount * 0.1
  }

  // Analyze the emotional journey in a text
  analyzeEmotionalJourney(text: string): EmotionalJourney[] {
    const doc = nlp(text)
    const sentences = doc.sentences().out('array')

    return sentences.map((sentenceText: string) => {
      const sentenceDoc = nlp(sentenceText)
      return {
        text: sentenceText,
        emotion: this.detectEmotion(sentenceDoc),
        intensity: this.measureIntensity(sentenceDoc),
      }
    })
  }

  // Find action items and commitments
  findActionItems(text: string) {
    const doc = nlp(text)

    return {
      // Find explicit todos
      todos: doc.match('(need to|must|should|have to) #Verb').out('array'),

      // Find commitments
      commitments: doc.match('(will|going to|planning to) #Verb').out('array'),

      // Find deadlines
      deadlines: doc.match('(by|before|due) #Date').out('array'),
    }
  }

  // Analyze social interactions
  analyzeSocialInteractions(text: string) {
    const doc = nlp(text)

    return {
      // Find mentioned people
      people: doc.people().out('array'),

      // Find social activities
      activities: doc
        .match('(met|talked|spoke|discussed|lunch|dinner) (with|to) #Person')
        .out('array'),

      // Find communication verbs
      communications: doc.match('#Person? (said|mentioned|told|asked|suggested)').out('array'),
    }
  }

  // Analyze decision making
  analyzeDecisions(text: string) {
    const doc = nlp(text)

    return {
      // Find decisions made
      decisions: doc.match('(decided|chose|picked|selected|opted) to? #Verb').out('array'),

      // Find alternatives considered
      alternatives: doc.match('(either|or|versus|vs) *').out('array'),

      // Find reasoning
      reasoning: doc
        .match('because *')
        .concat(doc.match('since *'))
        .concat(doc.match('due to *'))
        .out('array'),
    }
  }

  // Track habits and routines
  analyzeHabits(text: string) {
    const doc = nlp(text)

    return {
      // Find regular activities
      routines: doc.match('(usually|always|every|each) #Verb').out('array'),

      // Find frequency indicators
      frequency: doc.match('(daily|weekly|monthly|regularly|often) *').out('array'),

      // Find time-based patterns
      timePatterns: doc.match('(morning|afternoon|evening|night) *').out('array'),
    }
  }
}
