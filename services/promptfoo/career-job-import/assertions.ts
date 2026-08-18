interface JobImportOutput {
  jobTitle?: unknown;
  companyName?: unknown;
  jobDescription?: unknown;
  fullText?: unknown;
}

export = function (output: string) {
  const normalized = output
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed: JobImportOutput;
  try {
    parsed = JSON.parse(normalized) as JobImportOutput;
  } catch (error) {
    return {
      pass: false,
      score: 0,
      reason: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (Array.isArray(parsed) || !parsed || typeof parsed !== 'object') {
    return { pass: false, score: 0, reason: 'Expected a JSON object' };
  }

  const missing = ['jobTitle', 'companyName', 'fullText'].filter(
    (field) => typeof parsed[field as keyof JobImportOutput] !== 'string',
  );
  if (missing.length > 0) {
    return { pass: false, score: 0, reason: `Missing string fields: ${missing.join(', ')}` };
  }

  const title = parsed.jobTitle as string;
  const company = parsed.companyName as string;
  const fullText =
    typeof parsed.fullText === 'string' && parsed.fullText.trim().length > 0
      ? parsed.fullText
      : parsed.jobDescription;
  if (
    !/ai tooling engineer/i.test(title) ||
    !/whatnot/i.test(company) ||
    typeof fullText !== 'string' ||
    fullText.length < 500
  ) {
    return {
      pass: false,
      score: 0,
      reason: 'Expected the Whatnot title, company, and a complete job description',
    };
  }

  return { pass: true, score: 1, reason: 'Valid job import with expected Ashby fields' };
};
