import { parseModelJson } from '../shared/json-utils';
import type { OfferCase } from './cases';

interface Offer {
  baseSalary?: number;
  currency?: string;
  currencyAmbiguous?: boolean;
  location?: string;
  hasEquity?: boolean;
  equityType?: string;
  equityValue?: number;
  equityGrantTotal?: number;
  equityCliff?: number;
  equityVestingFrequency?: string;
  hasBonus?: boolean;
  requiresVisa?: boolean;
  visaType?: string;
  relocationAllowance?: number;
  employmentType?: string;
}

interface Person {
  filingStatus?: string;
  homeCity?: string;
  currentSavings?: number;
  currentRetirement?: number;
  petCount?: number;
}

interface Parsed {
  offers: Offer[];
  person: Person;
}

function locMatch(val: string | undefined | null, expected: string): boolean {
  if (!val) return false;
  const norm = val.toLowerCase().replace(/[-\s]+/g, ' ');
  return norm.includes(expected.toLowerCase());
}

function check<T>(val: T, expected: T, label: string): void {
  if (val !== expected) {
    throw new Error(`Expected ${label} = ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
  }
}

function checkLoc(val: string | undefined | null, expected: string, label: string): void {
  if (!locMatch(val, expected)) {
    throw new Error(`Expected ${label} matching "${expected}", got ${JSON.stringify(val)}`);
  }
}

export default function checkOffer(output: string, testCase: OfferCase): void {
  let parsed: Parsed;
  try {
    parsed = parseModelJson(output) as unknown as Parsed;
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  const offers = parsed.offers;
  if (!Array.isArray(offers)) {
    throw new Error('Missing "offers" array');
  }
  if (!parsed.person) {
    throw new Error('Missing "person" object');
  }

  const o = offers[0] || ({} as Offer);
  const p = parsed.person || ({} as Person);

  switch (testCase.caseId) {
    case 'la-baseline':
      check(o.baseSalary, 215000, 'baseSalary');
      check(o.currency, 'USD', 'currency');
      checkLoc(o.location, 'los angeles', 'location');
      if (p.filingStatus && p.filingStatus !== 'single') {
        check(p.filingStatus, 'single', 'filingStatus');
      }
      return;

    case 'london-offer':
      check(o.baseSalary, 140000, 'baseSalary');
      check(o.currency, 'GBP', 'currency');
      check(o.location, 'london', 'location');
      check(o.requiresVisa, true, 'requiresVisa');
      check(o.visaType, 'skilled-worker', 'visaType');
      return;

    case 'users-offer-notes':
      check(o.baseSalary, 135000, 'baseSalary');
      check(o.hasEquity, true, 'hasEquity');
      check(o.hasBonus, true, 'hasBonus');
      if (o.relocationAllowance == null) {
        throw new Error('Expected relocationAllowance to be set');
      }
      if (o.equityGrantTotal == null && o.equityValue == null) {
        throw new Error('Expected some equity value to be extracted');
      }
      return;

    case 'ambiguous-currency':
      check(o.currency, 'GBP', 'currency');
      return;

    case 'contradictory-currency':
      check(o.currency, null, 'currency');
      check(o.currencyAmbiguous, true, 'currencyAmbiguous');
      return;

    case 'partial-info':
      check(o.baseSalary, 200000, 'baseSalary');
      checkLoc(o.location, 'new york', 'location');
      return;

    case 'landmark-fidi':
      checkLoc(o.location, 'new york', 'location');
      check(p.filingStatus, 'married', 'filingStatus');
      return;

    case 'equity-rsu-cliff':
      check(o.hasEquity, true, 'hasEquity');
      check(o.equityType, 'rsu', 'equityType');
      check(o.equityCliff, 1, 'equityCliff');
      check(o.equityVestingFrequency, 'quarterly', 'equityVestingFrequency');
      return;

    case 'contractor':
      if (o.employmentType !== 'contractor' && o.employmentType !== 'self-employed') {
        throw new Error(`Expected employmentType contractor/self-employed, got ${o.employmentType}`);
      }
      check(p.filingStatus, 'single', 'filingStatus');
      return;

    case 'person-profile':
      check(p.currentSavings, 40000, 'currentSavings');
      check(p.currentRetirement, 80000, 'currentRetirement');
      check(p.petCount, 1, 'petCount');
      checkLoc(p.homeCity, 'los angeles', 'homeCity');
      return;

    case 'multi-offer':
      if (offers.length !== 2) {
        throw new Error(`Expected 2 offers, got ${offers.length}`);
      }
      check(offers[0].baseSalary, 220000, 'offers[0].baseSalary');
      checkLoc(offers[0].location, 'new york', 'offers[0].location');
      check(offers[1].baseSalary, 240000, 'offers[1].baseSalary');
      checkLoc(offers[1].location, 'san francisco', 'offers[1].location');
      return;
  }

  // Global location stress tests — generic checker driven by whichever
  // `expect*` fields the case sets.
  let ranAnyCheck = false;
  if (testCase.expectedCurrency !== undefined) {
    check(o.currency, testCase.expectedCurrency, 'currency');
    ranAnyCheck = true;
  }
  if (testCase.expectedLocation !== undefined) {
    checkLoc(o.location, testCase.expectedLocation, 'location');
    ranAnyCheck = true;
  }
  if (testCase.expectedBase !== undefined) {
    check(o.baseSalary, testCase.expectedBase, 'baseSalary');
    ranAnyCheck = true;
  }
  if (testCase.expectNullCurrency) {
    check(o.currency, null, 'currency');
    ranAnyCheck = true;
  }
  if (testCase.expectAmbiguousCurrency) {
    check(o.currencyAmbiguous, true, 'currencyAmbiguous');
    ranAnyCheck = true;
  }
  if (testCase.expectEquity) {
    check(o.hasEquity, true, 'hasEquity');
    ranAnyCheck = true;
  }
  if (testCase.expectBonus) {
    check(o.hasBonus, true, 'hasBonus');
    ranAnyCheck = true;
  }
  if (testCase.expectFilingStatus) {
    check(p.filingStatus, testCase.expectFilingStatus, 'filingStatus');
    ranAnyCheck = true;
  }
  if (testCase.expectEmploymentType) {
    check(o.employmentType, testCase.expectEmploymentType, 'employmentType');
    ranAnyCheck = true;
  }
  if (testCase.expectOffersCount !== undefined) {
    check(offers.length, testCase.expectOffersCount, 'offers.length');
    ranAnyCheck = true;
  }

  if (!ranAnyCheck) {
    throw new Error(`Unknown caseId: ${testCase.caseId}`);
  }
}
