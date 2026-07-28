import { readFileSync, writeFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('app/lib/offer-comparison/state-raw.json', 'utf-8'));
const states = raw.data as Array<Record<string, unknown>>;

const obj: Record<string, unknown> = {};
for (const s of states) {
  obj[s.slug as string] = {
    slug: s.slug,
    name: s.name,
    abbreviation: s.abbreviation,
    taxSystem: s.taxSystem,
    topMarginalRate: s.topMarginalRate,
    brackets: {
      single: (
        s.brackets as { single: Array<{ min: number; max: number | null; rate: number }> }
      ).single.map((b) => ({
        min: b.min,
        max: b.max ?? 999_999_999,
        rate: b.rate,
      })),
      married: (
        s.brackets as { married: Array<{ min: number; max: number | null; rate: number }> }
      ).married.map((b) => ({
        min: b.min,
        max: b.max ?? 999_999_999,
        rate: b.rate,
      })),
    },
    stateStandardDeduction: s.stateStandardDeduction,
  };
}

const json = JSON.stringify(obj, null, 2).replace(/"/g, "'");

const banner = [
  '// US State income tax data for 2026',
  '// Source: LevyIO (https://levyio.com/datasets/state-income-tax-rates-2026.json)',
  '// License: CC BY 4.0 — attribution: LevyIO (levyio.com)',
  '// Auto-generated from state-raw.json — do not edit directly',
  '',
  'export interface StateBracket {',
  '  min: number;',
  '  max: number;',
  '  rate: number;',
  '}',
  '',
  'export interface StateData {',
  '  slug: string;',
  '  name: string;',
  '  abbreviation: string;',
  "  taxSystem: 'none' | 'flat' | 'progressive';",
  '  topMarginalRate: number;',
  '  brackets: {',
  '    single: StateBracket[];',
  '    married: StateBracket[];',
  '  };',
  '  stateStandardDeduction: {',
  '    single: number;',
  '    married: number;',
  '  };',
  '}',
  '',
  'const SENTINEL = 999_000_000;',
  '',
  'function normalize(bracket: StateBracket): StateBracket {',
  '  return { min: bracket.min, max: bracket.max >= SENTINEL ? Infinity : bracket.max, rate: bracket.rate };',
  '}',
  '',
  'export const STATES: Record<string, StateData> = ' + json + ';',
  '',
  'const stateMap = new Map<string, StateData>();',
  'for (const key of Object.keys(STATES)) {',
  '  const s = STATES[key];',
  '  stateMap.set(key, {',
  '    ...s,',
  '    brackets: {',
  '      single: s.brackets.single.map(normalize),',
  '      married: s.brackets.married.map(normalize),',
  '    },',
  '  });',
  '}',
  '',
  'export function getState(slug: string): StateData | undefined {',
  '  return stateMap.get(slug);',
  '}',
  '',
  'export function computeStateTax(',
  '  stateSlug: string,',
  '  gross: number,',
  "  status: 'single' | 'married',",
  '): number {',
  '  const state = stateMap.get(stateSlug);',
  "  if (!state || state.taxSystem === 'none') return 0;",
  '',
  '  const deduction = state.stateStandardDeduction[status];',
  '  const taxable = Math.max(0, gross - deduction);',
  '',
  '  let tax = 0;',
  '  const brackets = state.brackets[status];',
  '  if (brackets.length === 0) return 0;',
  '',
  '  for (const bracket of brackets) {',
  '    if (taxable <= bracket.min) break;',
  '    const amountInBracket = Math.min(taxable, bracket.max) - bracket.min;',
  '    if (amountInBracket > 0) {',
  '      tax += amountInBracket * (bracket.rate / 100);',
  '    }',
  '  }',
  '  return tax;',
  '}',
].join('\n');

writeFileSync('app/lib/offer-comparison/state.ts', banner + '\n');
console.log('Done');
