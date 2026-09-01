// 2026 US Federal income tax brackets and rates
// Source: IRS Revenue Procedure 2025-32
// https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill

export type FilingStatus = 'single' | 'married';

export interface Bracket {
  min: number;
  max: number;
  rate: number;
}

export interface FederalTaxData {
  standardDeduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, Bracket[]>;
}

const BRACKETS_SINGLE: Bracket[] = [
  { min: 0, max: 12_400, rate: 10 },
  { min: 12_400, max: 50_400, rate: 12 },
  { min: 50_400, max: 105_700, rate: 22 },
  { min: 105_700, max: 201_775, rate: 24 },
  { min: 201_775, max: 256_225, rate: 32 },
  { min: 256_225, max: 640_600, rate: 35 },
  { min: 640_600, max: Infinity, rate: 37 },
];

const BRACKETS_MARRIED: Bracket[] = [
  { min: 0, max: 24_800, rate: 10 },
  { min: 24_800, max: 100_800, rate: 12 },
  { min: 100_800, max: 211_400, rate: 22 },
  { min: 211_400, max: 403_550, rate: 24 },
  { min: 403_550, max: 512_450, rate: 32 },
  { min: 512_450, max: 768_700, rate: 35 },
  { min: 768_700, max: Infinity, rate: 37 },
];

export const FEDERAL: FederalTaxData = {
  standardDeduction: {
    single: 16_100,
    married: 32_200,
  },
  brackets: {
    single: BRACKETS_SINGLE,
    married: BRACKETS_MARRIED,
  },
};

export function computeFederalTax(gross: number, status: FilingStatus): number {
  const deduction = FEDERAL.standardDeduction[status];
  const taxable = Math.max(0, gross - deduction);
  const brackets = FEDERAL.brackets[status];

  let tax = 0;
  for (const bracket of brackets) {
    if (taxable <= bracket.min) break;
    const amountInBracket = Math.min(taxable, bracket.max) - bracket.min;
    if (amountInBracket > 0) {
      tax += amountInBracket * (bracket.rate / 100);
    }
  }
  return tax;
}

export function computeFICA(gross: number): number {
  const ssWageBase = 176_100;
  const socialSecurity = Math.min(gross, ssWageBase) * 0.062;
  const medicare = gross * 0.0145;
  // doesn't account for the extra 0.9% Medicare surcharge above $200k single / $250k married
  return socialSecurity + medicare;
}
