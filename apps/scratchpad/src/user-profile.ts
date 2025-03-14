import type { HealthProfile } from '@ponti/utils/types'

// Fundamental Personal Identification
type PersonalIdentity = {
  uniqueId: string
  preferredName: string
  legalName?: string
  pronouns: string[]
  dateOfBirth?: Date
  birthPlace?: string
  nationality?: string[]
  ethnicity?: string[]
  languagesSpoken: {
    language: string
    proficiencyLevel: 'native' | 'fluent' | 'intermediate' | 'basic'
  }[]
}

// Demographic Information
type DemographicProfile = {
  gender: {
    biological?: 'male' | 'female' | 'intersex'
    identity: string[]
    sexualOrientation?: string[]
  }
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'partnership' | 'other'
  familyStructure?: {
    children: number
    dependents: number
    familyDynamics?: string
  }
}

// Educational Background
type EducationalProfile = {
  highestEducationLevel:
    | 'none'
    | 'primary'
    | 'secondary'
    | 'vocational'
    | 'undergraduate'
    | 'graduate'
    | 'postgraduate'
    | 'doctorate'
  institutions: {
    name: string
    type: 'school' | 'college' | 'university' | 'online' | 'professional'
    degree?: string
    fieldOfStudy?: string
    graduationYear?: number
  }[]
  academicInterests?: string[]
  learningStyles?: {
    type: 'visual' | 'auditory' | 'kinesthetic' | 'reading/writing'
    preference: number // 0-100 scale
  }[]
}

// Professional Information
type ProfessionalProfile = {
  currentOccupation?: string
  industryDomain?: string
  careerStage: 'entry-level' | 'mid-career' | 'senior' | 'executive' | 'freelance' | 'retired'
  professionalSkills: {
    skill: string
    proficiencyLevel: number // 0-100 scale
    yearsOfExperience?: number
  }[]
  employmentHistory?: {
    company: string
    position: string
    startDate: Date
    endDate?: Date
    responsibilities?: string[]
  }[]
  professionalCertifications?: {
    name: string
    issuingAuthority: string
    dateAcquired: Date
  }[]
}

// Psychological Profile
type PsychologicalProfile = {
  fears: string[]
  anxietiesAndInsecurities: string[]
  personalityTraits: {
    bigFiveModel: {
      openness: number // 0-100 scale
      conscientiousness: number // 0-100 scale
      extraversion: number // 0-100 scale
      agreeableness: number // 0-100 scale
      neuroticism: number // 0-100 scale
    }
    mbtiType?: string
    enneagramType?: number
  }
  emotionalIntelligence?: {
    selfAwareness: number // 0-100 scale
    selfRegulation: number // 0-100 scale
    motivation: number // 0-100 scale
    empathy: number // 0-100 scale
    socialSkills: number // 0-100 scale
  }
  mentalHealthProfile?: {
    diagnosedConditions?: string[]
    treatmentHistory?: string[]
    currentMentalState?: {
      stressLevel: number // 0-100 scale
      anxietyLevel: number // 0-100 scale
      depressionIndicators?: number // 0-100 scale
    }
  }
  cognitiveProfile?: {
    intelligenceType?: 'analytical' | 'creative' | 'practical' | 'emotional' | 'multiple'
    learningSpeed?: 'slow' | 'average' | 'fast'
    memoryType?: 'photographic' | 'auditory' | 'visual' | 'kinesthetic'
  }
}

// Personal Interests and Preferences
type InterestsProfile = {
  hobbies?: string[]
  passions?: string[]
  mediaPreferences: {
    books?: {
      genres: string[]
      favoriteAuthors?: string[]
    }
    movies?: {
      genres: string[]
      favoriteDirectors?: string[]
    }
    musicGenres?: string[]
    podcastTopics?: string[]
  }
  sportingInterests?: string[]
  travelPreferences?: {
    visitedCountries?: string[]
    travelStyle?: 'adventure' | 'luxury' | 'budget' | 'cultural' | 'relaxation'
    dreamDestinations?: string[]
  }
}

// Social and Relational Dynamics
type SocialProfile = {
  socialMediaPresence?: {
    platforms: string[]
    influenceLevel?: number // 0-100 scale
  }
  socialPersonality?: 'introvert' | 'extrovert' | 'ambivert'
  communicationStyles?: {
    primaryStyle: 'direct' | 'indirect' | 'analytical' | 'emotional'
    preferredCommunicationMedium?: 'text' | 'voice' | 'video' | 'inperson'
  }
  socialNetwork?: {
    closeRelationshipsCount: number
    professionalConnectionsCount?: number
    socialSupportNetwork?: {
      type: 'family' | 'friends' | 'professional' | 'community'
      strength: number // 0-100 scale
    }[]
  }
}

// Financial Profile
type FinancialProfile = {
  incomeRange?: {
    min: number
    max: number
    currency: string
  }
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired'
  financialLiteracy?: number // 0-100 scale
  investmentProfile?: {
    riskTolerance: 'low' | 'medium' | 'high'
    investmentTypes?: string[]
  }
  financialGoals?: string[]
}

// Technological Engagement
type TechnologicalProfile = {
  deviceUsage?: {
    primaryDevices: string[]
    averageScreenTime?: number // hours per day
  }
  technologicalProficiency?: {
    computerSkills: number // 0-100 scale
    programmingKnowledge?: string[]
    digitalLiteracy?: number // 0-100 scale
  }
  softwarePreferences?: {
    operatingSystems?: string[]
    preferredApps?: string[]
  }
  aiInteraction?: {
    previousAiExperience?: string[]
    aiAssistantPreferences?: string[]
  }
}

// Comprehensive User Interaction Metadata
type InteractionMetadata = {
  firstInteractionTimestamp: Date
  lastInteractionTimestamp: Date
  totalInteractionCount: number
  averageResponseLength?: number
  communicationTones?: string[]
  topicInterests?: string[]
}

// Comprehensive User Profile - Combining All Dimensions
type ComprehensiveUserProfile = {
  identity: PersonalIdentity
  demographics: DemographicProfile
  education: EducationalProfile
  professional: ProfessionalProfile
  psychological: PsychologicalProfile
  interests: InterestsProfile
  social: SocialProfile
  financial: FinancialProfile
  health: HealthProfile
  technological: TechnologicalProfile
  interactions: InteractionMetadata

  // Confidence and Privacy Metadata
  privacySettings?: {
    dataSharing: 'none' | 'minimal' | 'moderate' | 'extensive'
    consentLevel: number // 0-100 scale
  }
  confidenceScore?: {
    dataAccuracy: number // 0-100 scale
    dataCompleteness: number // 0-100 scale
  }

  // Temporal Tracking
  lastUpdated: Date
  versionHistory?: {
    timestamp: Date
    updatedFields?: string[]
  }[]
}
