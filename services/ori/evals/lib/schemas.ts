export const taskSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { enum: ['low', 'medium', 'high'] },
          dueAt: { type: 'string' },
        },
      },
    },
  },
};

export const voiceCleanupSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cleanedText'],
  properties: { cleanedText: { type: 'string', minLength: 1 } },
};

export const timeBlockSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'primary_intent',
    'title',
    'target_title',
    'participants',
    'location',
    'duration',
    'start_time',
    'end_time',
    'scheduling_window_start',
    'scheduling_window_end',
    'deadline_fixed',
    'recurrence_rule',
  ],
  properties: {
    primary_intent: {
      enum: [
        'add_task',
        'add_event',
        'add_recurring_event',
        'edit_event',
        'cancel_event',
        'search',
        'schedule_gap_fill',
      ],
    },
    title: { type: ['string', 'null'] },
    target_title: { type: ['string', 'null'] },
    participants: { type: ['array', 'null'], items: { type: 'string' } },
    location: { type: ['string', 'null'] },
    duration: { type: ['integer', 'null'] },
    start_time: { type: ['string', 'null'] },
    end_time: { type: ['string', 'null'] },
    scheduling_window_start: { type: ['string', 'null'] },
    scheduling_window_end: { type: ['string', 'null'] },
    deadline_fixed: { type: ['string', 'null'] },
    recurrence_rule: { type: ['string', 'null'] },
  },
};

const nullableString = { type: ['string', 'null'] };
const nullableNumber = { type: ['number', 'null'] };
const nullableBoolean = { type: ['boolean', 'null'] };

export const offerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['offers', 'person'],
  properties: {
    offers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'baseSalary',
          'currency',
          'currencyAmbiguous',
          'location',
          'hasEquity',
          'equityType',
          'equityValue',
          'equityGrantTotal',
          'equityVestingYears',
          'equityCliff',
          'equityVestingFrequency',
          'hasBonus',
          'bonusTargetPct',
          'bonusFrequency',
          'hasRelocation',
          'relocationAllowance',
          'relocationCurrency',
          'requiresVisa',
          'visaType',
          'employerCoversVisa',
          'startDate',
          'employmentType',
        ],
        properties: {
          baseSalary: nullableNumber,
          currency: nullableString,
          currencyAmbiguous: { type: 'boolean' },
          location: nullableString,
          hasEquity: nullableBoolean,
          equityType: nullableString,
          equityValue: nullableNumber,
          equityGrantTotal: nullableNumber,
          equityVestingYears: nullableNumber,
          equityCliff: nullableNumber,
          equityVestingFrequency: nullableString,
          hasBonus: nullableBoolean,
          bonusTargetPct: nullableNumber,
          bonusFrequency: nullableString,
          hasRelocation: nullableBoolean,
          relocationAllowance: nullableNumber,
          relocationCurrency: nullableString,
          requiresVisa: nullableBoolean,
          visaType: nullableString,
          employerCoversVisa: nullableBoolean,
          startDate: nullableString,
          employmentType: { enum: ['employee', 'contractor', null] },
        },
      },
    },
    person: {
      type: 'object',
      additionalProperties: false,
      required: [
        'homeCity',
        'filingStatus',
        'currentSavings',
        'currentRetirement',
        'currentMonthlySpend',
        'petCount',
      ],
      properties: {
        homeCity: nullableString,
        filingStatus: nullableString,
        currentSavings: nullableNumber,
        currentRetirement: nullableNumber,
        currentMonthlySpend: nullableNumber,
        petCount: nullableNumber,
      },
    },
  },
};

const jobStringFields = [
  'jobTitle',
  'companyName',
  'companyDescription',
  'jobDescription',
  'location',
  'salaryRange',
  'salaryDetails',
  'employmentType',
  'experienceLevel',
  'education',
  'industry',
  'postedDate',
  'applicationDeadline',
  'department',
  'hiringManager',
  'companySize',
  'fundingStage',
  'fullText',
];
const jobArrayFields = [
  'requirements',
  'skills',
  'benefits',
  'responsibilities',
  'technologyStack',
  'cultureAspects',
];

export const jobImportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...jobStringFields, ...jobArrayFields],
  properties: {
    ...Object.fromEntries(jobStringFields.map((field) => [field, { type: 'string' }])),
    ...Object.fromEntries(
      jobArrayFields.map((field) => [field, { type: 'array', items: { type: 'string' } }]),
    ),
  },
};
