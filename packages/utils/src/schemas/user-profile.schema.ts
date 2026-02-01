import * as z from 'zod';

import { healthProfileSchema } from './health-and-fitness.schema';

// Fundamental Personal Identification
export const personalIdentitySchema = z.object({
  uniqueId: z.string(),
  preferredName: z.string(),
  legalName: z.string().optional(),
  pronouns: z.array(z.string()),
  dateOfBirth: z.date().optional(),
  birthPlace: z.string().optional(),
  nationality: z.array(z.string()).optional(),
  ethnicity: z.array(z.string()).optional(),
  languagesSpoken: z.array(
    z.object({
      language: z.string(),
      proficiencyLevel: z.enum(['native', 'fluent', 'intermediate', 'basic']),
    }),
  ),
});

// Demographic Information
export const demographicProfileSchema = z.object({
  gender: z.object({
    biological: z.enum(['male', 'female', 'intersex']).optional(),
    identity: z.array(z.string()),
    sexualOrientation: z.array(z.string()).optional(),
  }),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'partnership', 'other']),
  familyStructure: z
    .object({
      children: z.number(),
      dependents: z.number(),
      familyDynamics: z.string().optional(),
    })
    .optional(),
});

// Educational Background
export const educationalProfileSchema = z.object({
  highestEducationLevel: z.enum([
    'none',
    'primary',
    'secondary',
    'vocational',
    'undergraduate',
    'graduate',
    'postgraduate',
    'doctorate',
  ]),
  institutions: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['school', 'college', 'university', 'online', 'professional']),
      degree: z.string().optional(),
      fieldOfStudy: z.string().optional(),
      graduationYear: z.number().optional(),
    }),
  ),
  academicInterests: z.array(z.string()).optional(),
  learningStyles: z
    .array(
      z.object({
        type: z.enum(['visual', 'auditory', 'kinesthetic', 'reading/writing']),
        preference: z.number(), // 0-100 scale
      }),
    )
    .optional(),
});

// Professional Information
export const professionalProfileSchema = z.object({
  currentOccupation: z.string().optional(),
  industryDomain: z.string().optional(),
  careerStage: z.enum(['entry-level', 'mid-career', 'senior', 'executive', 'freelance', 'retired']),
  professionalSkills: z.array(
    z.object({
      skill: z.string(),
      proficiencyLevel: z.number(), // 0-100 scale
      yearsOfExperience: z.number().optional(),
    }),
  ),
  employmentHistory: z
    .array(
      z.object({
        company: z.string(),
        position: z.string(),
        startDate: z.string().describe('YYYY-MM-DD'),
        endDate: z.string().optional().describe('YYYY-MM-DD'),
        responsibilities: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  professionalCertifications: z
    .array(
      z.object({
        name: z.string(),
        issuingAuthority: z.string(),
        dateAcquired: z.string().describe('YYYY-MM-DD'),
      }),
    )
    .optional(),
});

// Psychological Profile
export const psychologicalProfileSchema = z.object({
  fears: z.array(z.string()),
  anxietiesAndInsecurities: z.array(z.string()),
  personalityTraits: z.object({
    bigFiveModel: z.object({
      openness: z.number(), // 0-100 scale
      conscientiousness: z.number(), // 0-100 scale
      extroversion: z.number(), // 0-100 scale
      agreeableness: z.number(), // 0-100 scale
      neuroticism: z.number(), // 0-100 scale
    }),
    myersBriggsType: z.string().optional(),
    enneagramType: z.number().optional(),
  }),
  emotionalIntelligence: z
    .object({
      selfAwareness: z.number(), // 0-100 scale
      selfRegulation: z.number(), // 0-100 scale
      motivation: z.number(), // 0-100 scale
      empathy: z.number(), // 0-100 scale
      socialSkills: z.number(), // 0-100 scale
    })
    .optional(),
  mentalHealthProfile: z
    .object({
      diagnosedConditions: z.array(z.string()).optional(),
      treatmentHistory: z.array(z.string()).optional(),
      currentMentalState: z
        .object({
          stressLevel: z.number(), // 0-100 scale
          anxietyLevel: z.number(), // 0-100 scale
          depressionIndicators: z.number().optional(), // 0-100 scale
        })
        .optional(),
    })
    .optional(),
  cognitiveProfile: z
    .object({
      intelligenceType: z
        .enum(['analytical', 'creative', 'practical', 'emotional', 'multiple'])
        .optional(),
      learningSpeed: z.enum(['slow', 'average', 'fast']).optional(),
      memoryType: z.enum(['photographic', 'auditory', 'visual', 'kinesthetic']).optional(),
    })
    .optional(),
});

// Personal Interests and Preferences
export const interestsProfileSchema = z.object({
  hobbies: z.array(z.string()).optional(),
  passions: z.array(z.string()).optional(),
  mediaPreferences: z.object({
    books: z
      .object({
        genres: z.array(z.string()),
        favoriteAuthors: z.array(z.string()).optional(),
      })
      .optional(),
    movies: z
      .object({
        genres: z.array(z.string()),
        favoriteDirectors: z.array(z.string()).optional(),
      })
      .optional(),
    musicGenres: z.array(z.string()).optional(),
    podcastTopics: z.array(z.string()).optional(),
  }),
  sportingInterests: z.array(z.string()).optional(),
  travelPreferences: z
    .object({
      visitedCountries: z.array(z.string()).optional(),
      travelStyle: z.enum(['adventure', 'luxury', 'budget', 'cultural', 'relaxation']).optional(),
      dreamDestinations: z.array(z.string()).optional(),
    })
    .optional(),
});

// Social and Relational Dynamics
export const socialProfileSchema = z.object({
  socialMediaPresence: z
    .object({
      platforms: z.array(z.string()),
      influenceLevel: z.number().optional(), // 0-100 scale
    })
    .optional(),
  socialPersonality: z.enum(['introvert', 'extrovert', 'ambivert']).optional(),
  communicationStyles: z
    .object({
      primaryStyle: z.enum(['direct', 'indirect', 'analytical', 'emotional']),
      preferredCommunicationMedium: z.enum(['text', 'voice', 'video', 'inperson']).optional(),
    })
    .optional(),
  socialNetwork: z
    .object({
      closeRelationshipsCount: z.number(),
      professionalConnectionsCount: z.number().optional(),
      socialSupportNetwork: z
        .array(
          z.object({
            type: z.enum(['family', 'friends', 'professional', 'community']),
            strength: z.number(), // 0-100 scale
          }),
        )
        .optional(),
    })
    .optional(),
});

// Financial Profile
export const financialProfileSchema = z.object({
  incomeRange: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    })
    .optional(),
  employmentStatus: z.enum(['employed', 'self-employed', 'unemployed', 'student', 'retired']),
  financialLiteracy: z.number().optional(), // 0-100 scale
  investmentProfile: z
    .object({
      riskTolerance: z.enum(['low', 'medium', 'high']),
      investmentTypes: z.array(z.string()).optional(),
    })
    .optional(),
  financialGoals: z.array(z.string()).optional(),
});

// Technological Engagement
export const technologicalProfileSchema = z.object({
  deviceUsage: z
    .object({
      primaryDevices: z.array(z.string()),
      averageScreenTime: z.number().optional(), // hours per day
    })
    .optional(),
  technologicalProficiency: z
    .object({
      computerSkills: z.number(), // 0-100 scale
      programmingKnowledge: z.array(z.string()).optional(),
      digitalLiteracy: z.number().optional(), // 0-100 scale
    })
    .optional(),
  softwarePreferences: z
    .object({
      operatingSystems: z.array(z.string()).optional(),
      preferredApps: z.array(z.string()).optional(),
    })
    .optional(),
  aiInteraction: z
    .object({
      previousAiExperience: z.array(z.string()).optional(),
      aiAssistantPreferences: z.array(z.string()).optional(),
    })
    .optional(),
});

// Comprehensive User Interaction Metadata
export const interactionMetadataSchema = z.object({
  firstInteractionTimestamp: z.date(),
  lastInteractionTimestamp: z.date(),
  totalInteractionCount: z.number(),
  averageResponseLength: z.number().optional(),
  communicationTones: z.array(z.string()).optional(),
  topicInterests: z.array(z.string()).optional(),
});

// Comprehensive User Profile
export const comprehensiveUserProfileSchema = z.object({
  identity: personalIdentitySchema,
  demographics: demographicProfileSchema,
  education: educationalProfileSchema,
  professional: professionalProfileSchema,
  psychological: psychologicalProfileSchema,
  interests: interestsProfileSchema,
  social: socialProfileSchema,
  financial: financialProfileSchema,
  health: healthProfileSchema,
  technological: technologicalProfileSchema,
  interactions: interactionMetadataSchema,

  privacySettings: z
    .object({
      dataSharing: z.enum(['none', 'minimal', 'moderate', 'extensive']),
      consentLevel: z.number(), // 0-100 scale
    })
    .optional(),
  confidenceScore: z
    .object({
      dataAccuracy: z.number(), // 0-100 scale
      dataCompleteness: z.number(), // 0-100 scale
    })
    .optional(),

  lastUpdated: z.date(),
  versionHistory: z
    .array(
      z.object({
        timestamp: z.date(),
        updatedFields: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

// Export inferred types from schemas
export type PersonalIdentity = z.infer<typeof personalIdentitySchema>;
export type DemographicProfile = z.infer<typeof demographicProfileSchema>;
export type EducationalProfile = z.infer<typeof educationalProfileSchema>;
export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export type PsychologicalProfile = z.infer<typeof psychologicalProfileSchema>;
export type InterestsProfile = z.infer<typeof interestsProfileSchema>;
export type SocialProfile = z.infer<typeof socialProfileSchema>;
export type FinancialProfile = z.infer<typeof financialProfileSchema>;
export type TechnologicalProfile = z.infer<typeof technologicalProfileSchema>;
export type InteractionMetadata = z.infer<typeof interactionMetadataSchema>;
export type ComprehensiveUserProfile = z.infer<typeof comprehensiveUserProfileSchema>;
