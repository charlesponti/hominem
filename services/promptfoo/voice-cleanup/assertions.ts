import { parseModelJson } from '../shared/json-utils';

interface AssertionResult {
  pass: boolean;
  score: number;
  reason: string;
}

export = function (output: string, context: { vars: Record<string, unknown> }): AssertionResult {
  let parsed: { cleanedText: string };
  try {
    parsed = parseModelJson(output) as unknown as { cleanedText: string };
  } catch (e) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${(e as Error).message}` };
  }

  const cleaned = parsed.cleanedText;
  if (typeof cleaned !== 'string' || !cleaned.length) {
    return { pass: false, score: 0, reason: 'Missing or empty "cleanedText" field' };
  }

  const lower = cleaned.toLowerCase();
  const problems: string[] = [];

  const mustKeep: string[] = context.vars.mustPreserve
    ? JSON.parse(context.vars.mustPreserve as string)
    : [];
  for (const term of mustKeep) {
    if (!lower.includes(term.toLowerCase())) {
      problems.push(`Lost preserved detail: "${term}"`);
    }
  }

  const fillerWords = ['um', 'uh'];
  for (const filler of fillerWords) {
    if (new RegExp(`\\b${filler}\\b`, 'i').test(cleaned)) {
      problems.push(`Filler word "${filler}" not removed`);
    }
  }

  return problems.length
    ? { pass: false, score: 0, reason: problems.join('; ') }
    : { pass: true, score: 1, reason: 'Filler removed, key details preserved' };
};
