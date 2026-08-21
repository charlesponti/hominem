export type OfferCase = {
  caseId: string;
  notes: string;
  expectedCurrency?: string;
  expectedLocation?: string;
  expectedBase?: number;
  expectBonus?: boolean;
  expectEquity?: boolean;
  expectFilingStatus?: string;
  expectEmploymentType?: string;
  expectNullCurrency?: boolean;
  expectAmbiguousCurrency?: boolean;
  expectOffersCount?: number;
  expectedReason?: string;
};

export const CASES: OfferCase[] = [
  {
    caseId: 'la-baseline',
    notes: '215k base salary, Los Angeles, single filer, 40k savings, 80k 401k',
  },
  {
    caseId: 'london-offer',
    notes:
      '140k gbp, London, Tate Modern office, Skilled Worker visa, employer covers NHS surcharge, 4k relocation, single person',
  },
  {
    caseId: 'users-offer-notes',
    notes:
      '135k, 30% of base equity over 4 years, (50k) 1 year 15%, bi annual bonus, quarterly performance reviews, visa, 4k relocation, Tate Modern',
  },
  {
    caseId: 'ambiguous-currency',
    notes: '135k salary, London office, 10% bonus',
  },
  {
    caseId: 'contradictory-currency',
    notes: '$135k salary, London office, 10% bonus',
  },
  {
    caseId: 'partial-info',
    notes: '200k base, senior engineer, NYC',
  },
  {
    caseId: 'landmark-fidi',
    notes: '250k base, FiDi office, 15% annual bonus, married',
  },
  {
    caseId: 'equity-rsu-cliff',
    notes: '300k base, 100k RSU grant over 4 years, 1 year cliff, quarterly vest, San Francisco',
  },
  {
    caseId: 'contractor',
    notes: '175k contractor rate, no benefits, Austin Texas, single, 50k savings',
  },
  {
    caseId: 'person-profile',
    notes: 'Currently in LA, single, 40k savings, 80k in 401k, spend about 7k a month total, have a dog',
  },
  {
    caseId: 'multi-offer',
    notes:
      'Offer A: 220k, NYC, 15% bonus, no equity. Offer B: 240k, SF, 10% bonus, 50k RSU grant over 4 years. Single, no pets.',
  },

  // ============ Global locations — 20 stress tests ============

  {
    caseId: 'tokyo-jpy',
    notes: '18 million yen, Tokyo, Roppongi office, no bonus, no relocation, single',
    expectedCurrency: 'JPY',
    expectedLocation: 'tokyo',
    expectedBase: 18000000,
    expectedReason: 'Correct GBP inference from Tokyo location',
  },
  {
    caseId: 'singapore-sgd',
    notes: 'SGD 250k, Singapore, Marina Bay, 15% bonus, 50k RSU grant over 3 years',
    expectedCurrency: 'SGD',
    expectedLocation: 'singapore',
    expectedBase: 250000,
    expectBonus: true,
    expectEquity: true,
    expectedReason: 'Correct SGD extraction with bonus and RSU',
  },
  {
    caseId: 'sydney-aud',
    notes: '200k base, Sydney, 10% bonus, super included, start March 2027',
    expectedCurrency: 'AUD',
    expectedLocation: 'sydney',
    expectedBase: 200000,
    expectBonus: true,
    expectedReason: 'Correct AUD inference from Sydney',
  },
  {
    caseId: 'berlin-eur',
    notes: '€120k, Berlin, 5% annual bonus, 30 days PTO',
    expectedCurrency: 'EUR',
    expectedLocation: 'berlin',
    expectedBase: 120000,
    expectBonus: true,
    expectedReason: 'Correct EUR from € symbol + Berlin',
  },
  {
    caseId: 'paris-eur',
    notes: '€150k base, Paris office near Opera, 20% target bonus, ISO options grant',
    expectedCurrency: 'EUR',
    expectedLocation: 'paris',
    expectedBase: 150000,
    expectBonus: true,
    expectEquity: true,
    expectedReason: 'Correct EUR from € + Paris, with bonus and options',
  },
  {
    caseId: 'dubai-aed',
    notes: '500k AED, Dubai, DIFC, no income tax, 10% bonus, married',
    expectedCurrency: 'AED',
    expectedLocation: 'dubai',
    expectedBase: 500000,
    expectBonus: true,
    expectFilingStatus: 'married',
    expectedReason: 'Correct AED with bonus and married filing',
  },
  {
    caseId: 'zurich-chf',
    notes: '220k CHF, Zurich, 10% pension contribution, 15% bonus',
    expectedCurrency: 'CHF',
    expectedLocation: 'zurich',
    expectedBase: 220000,
    expectBonus: true,
    expectedReason: 'Correct CHF from explicit CHF symbol',
  },
  {
    caseId: 'toronto-cad',
    notes: '180k CAD, Toronto, Yonge and Bloor, 5k relocation, RRSP match 4%',
    expectedCurrency: 'CAD',
    expectedLocation: 'toronto',
    expectedBase: 180000,
    expectedReason: 'Correct CAD from explicit CAD + Toronto landmark',
  },
  {
    caseId: 'bangalore-inr',
    notes: '4M INR, Bangalore, Whitefield office, 10% bonus, stock options',
    expectedCurrency: 'INR',
    expectedLocation: 'bangalore',
    expectedBase: 4000000,
    expectBonus: true,
    expectEquity: true,
    expectedReason: 'Correct INR with bonus and stock options',
  },
  {
    caseId: 'sao-paulo-brl',
    notes: '400k BRL, São Paulo, Faria Lima, 15% bonus, 30 days vacation',
    expectedCurrency: 'BRL',
    expectedLocation: 'sao paulo',
    expectedBase: 400000,
    expectBonus: true,
    expectedReason: 'Correct BRL from explicit BRL + São Paulo landmark',
  },
  {
    caseId: 'seattle-usd',
    notes: '$250k base, Seattle, 100k RSU over 4 years graded, 15% bonus, married filing jointly',
    expectedCurrency: 'USD',
    expectedLocation: 'seattle',
    expectedBase: 250000,
    expectBonus: true,
    expectEquity: true,
    expectFilingStatus: 'married',
    expectedReason: 'Correct USD + RSU details + married filing jointly',
  },
  {
    caseId: 'london-ontario',
    notes: '150k, London Ontario Canada, software engineer, 10% bonus',
    expectedCurrency: 'CAD',
    expectedLocation: 'london',
    expectedBase: 150000,
    expectBonus: true,
    expectedReason: 'Correct CAD (London Ontario = Canada, not UK)',
  },
  {
    caseId: 'hourly-contractor',
    notes: '$150 per hour, New York City, 6 month contract, no benefits, single',
    expectedCurrency: 'USD',
    expectedLocation: 'new york',
    expectEmploymentType: 'contractor',
    expectFilingStatus: 'single',
    expectedReason: 'Correct hourly rate → contractor + NYC',
  },
  {
    caseId: 'signon-heavy',
    notes: '300k base, San Francisco, 50k sign-on bonus, RSU 200k over 4 years, 1yr cliff quarterly vest',
    expectedCurrency: 'USD',
    expectedLocation: 'san francisco',
    expectedBase: 300000,
    expectBonus: true,
    expectEquity: true,
    expectedReason: 'Correct SF + sign-on bonus + RSU with cliff/vesting',
  },
  {
    caseId: 'dublin-eur',
    notes: '€130k, Dublin, Google office, 10% bonus, 5k relocation',
    expectedCurrency: 'EUR',
    expectedLocation: 'dublin',
    expectedBase: 130000,
    expectBonus: true,
    expectedReason: 'Correct EUR from € + Dublin (Ireland uses EUR)',
  },
  {
    caseId: 'amsterdam-eur',
    notes: '€140k base, Amsterdam, 30% ruling, 8% annual bonus',
    expectedCurrency: 'EUR',
    expectedLocation: 'amsterdam',
    expectedBase: 140000,
    expectBonus: true,
    expectedReason: 'Correct EUR from € + Amsterdam',
  },
  {
    caseId: 'stockholm-sek',
    notes: '1.2 million SEK, Stockholm, 12% pension, 10% bonus',
    expectedCurrency: 'SEK',
    expectedLocation: 'stockholm',
    expectedBase: 1200000,
    expectBonus: true,
    expectedReason: 'Correct SEK from explicit SEK + Stockholm',
  },
  {
    caseId: 'cape-town-zar',
    notes: '1.8M ZAR, Cape Town, Waterfront office, remote-friendly, 10% bonus',
    expectedCurrency: 'ZAR',
    expectedLocation: 'cape town',
    expectedBase: 1800000,
    expectBonus: true,
    expectedReason: 'Correct ZAR from explicit ZAR + Cape Town',
  },
  {
    caseId: 'no-location',
    notes: 'Total comp 350k, RSUs, 15% bonus, fully remote — location TBD',
    expectNullCurrency: true,
    expectEquity: true,
    expectBonus: true,
    expectedReason: 'Correctly returns null currency for no location',
  },
  {
    caseId: 'fractional-cto',
    notes: '£500/day, London, 3 days per week, 12 month contract, outside IR35',
    expectedCurrency: 'GBP',
    expectedLocation: 'london',
    expectEmploymentType: 'contractor',
    expectedReason: 'Correct day-rate contractor extraction with IR35 context',
  },
  {
    caseId: 'equity-iso-vs-nso',
    notes: '220k base, 50k NSO grant at current FMV $10/share, strike price $15, 4yr monthly vest, no cliff',
    expectEquity: true,
    expectedReason: 'Correctly extracts NSO details with FMV, strike, vesting schedule',
  },
];
