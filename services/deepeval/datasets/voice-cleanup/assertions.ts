import { parseModelJson } from '../shared/json-utils';

// Spoken ordinals ("the fifteenth") are equally valid cleaned up as numerals
// ("the 15th") — the same normalization already expected for spelled-out
// digits ("four five two one" -> "4521").
const ORDINAL_NUMERALS: Record<string, string> = {
  first: '1st',
  second: '2nd',
  third: '3rd',
  fourth: '4th',
  fifth: '5th',
  sixth: '6th',
  seventh: '7th',
  eighth: '8th',
  ninth: '9th',
  tenth: '10th',
  eleventh: '11th',
  twelfth: '12th',
  thirteenth: '13th',
  fourteenth: '14th',
  fifteenth: '15th',
  sixteenth: '16th',
  seventeenth: '17th',
  eighteenth: '18th',
  nineteenth: '19th',
  twentieth: '20th',
  thirtieth: '30th',
  thirty_first: '31st',
};

export default function checkCleanup(output: string, mustPreserve: string[]): void {
  let parsed: { cleanedText: string };
  try {
    parsed = parseModelJson(output) as unknown as { cleanedText: string };
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  const cleaned = parsed.cleanedText;
  if (typeof cleaned !== 'string' || !cleaned.length) {
    throw new Error('Missing or empty "cleanedText" field');
  }

  const lower = cleaned.toLowerCase();
  const problems: string[] = [];

  for (const term of mustPreserve) {
    const alt = ORDINAL_NUMERALS[term.toLowerCase()];
    const present = lower.includes(term.toLowerCase()) || (alt !== undefined && lower.includes(alt));
    if (!present) {
      problems.push(`Lost preserved detail: "${term}"`);
    }
  }

  const fillerWords = ['um', 'uh'];
  for (const filler of fillerWords) {
    if (new RegExp(`\\b${filler}\\b`, 'i').test(cleaned)) {
      problems.push(`Filler word "${filler}" not removed`);
    }
  }

  if (problems.length) {
    throw new Error(problems.join('; '));
  }
}
