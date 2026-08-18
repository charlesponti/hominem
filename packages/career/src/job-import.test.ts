import { describe, expect, it } from 'vitest';

import {
  extractJobPostingText,
  JobImportError,
  normalizeJobUrl,
  parseJobImportContent,
} from './job-import';

const validPosting = {
  jobTitle: 'AI Tooling Engineer',
  companyName: 'Whatnot',
  jobDescription: 'Build dependable AI tools.',
  fullText: 'Build dependable AI tools.',
};

describe('job import parsing', () => {
  it('accepts plain JSON and markdown-fenced JSON', () => {
    expect(
      parseJobImportContent(JSON.stringify(validPosting), 'https://example.com/job'),
    ).toMatchObject({
      jobTitle: 'AI Tooling Engineer',
      companyName: 'Whatnot',
      wordCount: 4,
    });
    expect(
      parseJobImportContent(
        `Here is the result:\n\n\`\`\`json\n${JSON.stringify(validPosting)}\n\`\`\``,
        'https://example.com/job',
      ),
    ).toMatchObject({ companyName: 'Whatnot' });
  });

  it('returns a stable error for provider prose instead of JSON.parse details', () => {
    expect(() =>
      parseJobImportContent('The user wants a job imported.', 'https://example.com/job'),
    ).toThrow(
      new JobImportError(
        'EXTRACTION_FAILED',
        'We couldn’t read the job details from this posting. You can retry or paste the description.',
        true,
      ),
    );
  });

  it('rejects an empty posting with a manual fallback message', () => {
    expect(() =>
      parseJobImportContent(
        JSON.stringify({ jobTitle: 'Role', companyName: 'Company' }),
        'https://example.com/job',
      ),
    ).toThrow('The page opened, but no complete job description was available.');
  });

  it('validates URL scheme', () => {
    expect(normalizeJobUrl('https://jobs.example.com/posting').hostname).toBe('jobs.example.com');
    expect(() => normalizeJobUrl('javascript:alert(1)')).toThrow('Enter a valid job posting URL.');
  });

  it('extracts server-rendered Ashby posting content', () => {
    const text = extractJobPostingText(
      '<html><head><title>AI Engineer @ Whatnot</title><meta name="description" content="Build useful AI tools &amp; workflows for the team."></head><body><h1>AI Engineer</h1><p>Build and ship internal tools for Whatnot. This role owns projects end to end and partners with teams across the company.</p></body></html>',
    );
    expect(text).toContain('AI Engineer @ Whatnot');
    expect(text).toContain('Build useful AI tools & workflows');
  });
});
