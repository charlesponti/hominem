interface JobImportOutput {
  jobTitle?: unknown;
  companyName?: unknown;
  jobDescription?: unknown;
  fullText?: unknown;
}

export default function checkJobImport(output: string): void {
  const normalized = output
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed: JobImportOutput;
  try {
    parsed = JSON.parse(normalized) as JobImportOutput;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (Array.isArray(parsed) || !parsed || typeof parsed !== 'object') {
    throw new Error('Expected a JSON object');
  }

  const missing = ['jobTitle', 'companyName', 'fullText'].filter(
    (field) => typeof parsed[field as keyof JobImportOutput] !== 'string',
  );
  if (missing.length > 0) {
    throw new Error(`Missing string fields: ${missing.join(', ')}`);
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
    throw new Error('Expected the Whatnot title, company, and a complete job description');
  }
}
