import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';

import { createChatCompletion, getChatCompletionText } from '@hominem/ai';
import {
  sql,
  type CareerProfileRecord,
  type CareerSocialLinksRecord,
  type DbHandle,
} from '@hominem/db';
import type {
  ResumeImportDiff,
  ResumeListItemChange,
  ResumeScalarFieldChange,
} from '@hominem/queues';
import PDFParser from 'pdf2json';
import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const presentDateValues = new Set(['present', 'current', 'now']);

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePortfolioSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/g, '');
}

function normalizeResumeDate(value: unknown): string | null {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) return null;
  if (presentDateValues.has(trimmed.toLowerCase())) return null;

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  const normalized = monthMatch ? `${trimmed}-01` : trimmed;
  return normalized;
}

function isValidResumeDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const nonBlankString = z.string().trim().min(1);
const optionalString = z.preprocess(normalizeOptionalString, z.string().nullable());
const resumeDate = z.preprocess(
  normalizeResumeDate,
  z
    .string()
    .refine(isValidResumeDate, 'Expected a valid date in YYYY-MM-DD or YYYY-MM format.')
    .nullable(),
);

export const resumeSchema = z.object({
  portfolio: z.object({
    slug: z
      .string()
      .transform(normalizePortfolioSlug)
      .pipe(z.string().min(3).max(50).regex(slugPattern)),
    title: nonBlankString,
    name: nonBlankString,
    initials: optionalString,
    job_title: nonBlankString,
    bio: nonBlankString,
    tagline: nonBlankString,
    current_location: nonBlankString,
    email: z.string().trim().email(),
    phone: optionalString,
    availability_status: z.boolean(),
    open_to_remote: z.boolean().optional().default(false),
    is_public: z.boolean(),
    is_active: z.boolean(),
  }),
  social_links: z
    .object({
      github: optionalString,
      linkedin: optionalString,
      twitter: optionalString,
      website: optionalString,
    })
    .nullable(),
  workExperience: z
    .array(
      z.object({
        company: nonBlankString,
        description: nonBlankString,
        role: nonBlankString,
        start_date: resumeDate,
        end_date: resumeDate,
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        name: nonBlankString,
        level: z.number().finite().min(1).max(100),
        category: optionalString,
        description: optionalString,
        years_of_experience: z.number().finite().min(0).optional().nullable(),
        certifications: z.array(nonBlankString).default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        title: nonBlankString,
        description: nonBlankString,
        short_description: optionalString,
        technologies: z.array(nonBlankString).default([]),
        live_url: optionalString,
        github_url: optionalString,
        status: z.enum(['in-progress', 'completed', 'archived']),
      }),
    )
    .default([]),
  stats: z
    .array(
      z.object({
        label: nonBlankString,
        value: nonBlankString,
      }),
    )
    .default([]),
});

export type ConvertedResumeData = z.infer<typeof resumeSchema>;
const resumeParserJsonSchema = z.toJSONSchema(resumeSchema);

const RESUME_PARSER_PROMPT_URL = new URL('./prompts/resume-parser.md', import.meta.url);
let resumeParserSystemPromptPromise: Promise<string> | null = null;

async function loadResumeParserSystemPrompt(): Promise<string> {
  if (!resumeParserSystemPromptPromise) {
    resumeParserSystemPromptPromise = readFile(RESUME_PARSER_PROMPT_URL, 'utf8').then((content) =>
      content.trim(),
    );
  }
  return resumeParserSystemPromptPromise;
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(jsonMatch?.[1] ?? trimmed);
}

export class ResumeParseError extends Error {
  kind: 'ai-parse' | 'schema-validation';
  issues?: z.ZodIssue[];
  cause?: unknown;

  constructor(
    kind: 'ai-parse' | 'schema-validation',
    message: string,
    options?: { issues?: z.ZodIssue[]; cause?: unknown },
  ) {
    super(message);
    this.name = 'ResumeParseError';
    this.kind = kind;
    this.issues = options?.issues;
    this.cause = options?.cause;
  }
}

/**
 * Extracts raw text content from a resume PDF file.
 */
export async function extractPdfText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(undefined, true);
    parser.on('pdfParser_dataError', (data) => {
      const error = data instanceof Error ? data : data.parserError;
      reject(error);
    });
    parser.on('pdfParser_dataReady', () => {
      try {
        resolve(parser.getRawTextContent());
      } catch (error) {
        reject(error);
      }
    });
    parser.parseBuffer(buffer);
  });
}

/**
 * Sends extracted resume text to the LLM and validates the structured response.
 * Throws `ResumeParseError` on either an AI-parsing or schema-validation failure.
 */
export async function parseResumeWithAI(pdfText: string): Promise<ConvertedResumeData> {
  const systemPrompt = await loadResumeParserSystemPrompt();

  const result = await createChatCompletion({
    responseFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: 'resume_parser',
        schema: resumeParserJsonSchema,
        strict: true,
      },
    },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Parse this resume into structured JSON. Resume text:\n${pdfText}` },
    ],
  });

  const aiContent = getChatCompletionText(result);
  if (!aiContent.trim()) {
    throw new ResumeParseError('ai-parse', 'The AI parser returned an empty response.');
  }

  let parsedResume: unknown;
  try {
    parsedResume = parseJsonObject(aiContent);
  } catch (error) {
    throw new ResumeParseError('ai-parse', 'The AI parser returned malformed resume data.', {
      cause: error,
    });
  }

  const { success, data, error: schemaError } = resumeSchema.safeParse(parsedResume);
  if (!success) {
    throw new ResumeParseError(
      'schema-validation',
      'The parsed resume data was incomplete or invalid.',
      { issues: schemaError.issues },
    );
  }

  return data;
}

function truncateSlugBase(slug: string, suffix = ''): string {
  const maxBaseLength = 50 - suffix.length;
  return slug.slice(0, maxBaseLength).replace(/-$/g, '') || 'portfolio';
}

/**
 * Generates a unique career-profile slug, appending a numeric suffix on collision.
 */
export async function generateUniqueSlug(
  handle: DbHandle,
  base: string,
  fallbackBase = 'portfolio',
): Promise<string> {
  const normalizedBase =
    normalizePortfolioSlug(base) || normalizePortfolioSlug(fallbackBase) || 'portfolio';
  const root = truncateSlugBase(normalizedBase);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${truncateSlugBase(root, suffix)}${suffix}`;
    const existing = await handle
      .selectFrom('app.careerProfile')
      .select('id')
      .where(sql`lower(slug)`, '=', candidate.toLowerCase())
      .executeTakeFirst();

    if (!existing) return candidate;
  }

  throw new Error('Could not generate a unique profile slug.');
}

const BASICS_FIELD_MAP: Array<{
  field: keyof CareerProfileRecord;
  resumeKey: keyof ConvertedResumeData['portfolio'];
  label: string;
}> = [
  { field: 'headline', resumeKey: 'job_title', label: 'Job title' },
  { field: 'summary', resumeKey: 'bio', label: 'Bio' },
  { field: 'tagline', resumeKey: 'tagline', label: 'Tagline' },
  { field: 'location', resumeKey: 'current_location', label: 'Location' },
  { field: 'email', resumeKey: 'email', label: 'Email' },
  { field: 'phone', resumeKey: 'phone', label: 'Phone' },
  { field: 'initials', resumeKey: 'initials', label: 'Initials' },
  { field: 'availabilityStatus', resumeKey: 'availability_status', label: 'Available for work' },
  { field: 'openToRemote', resumeKey: 'open_to_remote', label: 'Open to remote' },
];

type SocialLinkField = 'github' | 'linkedin' | 'twitter' | 'website';

const SOCIAL_FIELD_MAP: Array<{ field: SocialLinkField; label: string }> = [
  { field: 'github', label: 'GitHub' },
  { field: 'linkedin', label: 'LinkedIn' },
  { field: 'twitter', label: 'Twitter / X' },
  { field: 'website', label: 'Website' },
];

/**
 * Diffs freshly-parsed resume data against the user's current profile.
 * Emits a scalar-field change only where the value actually differs; every
 * parsed work-experience/skill/project entry is emitted unconditionally
 * since those are new rows, not diffable sub-fields of an existing one.
 */
export function buildResumeImportDiff(
  parsed: ConvertedResumeData,
  currentProfile: CareerProfileRecord | null,
  currentSocial: CareerSocialLinksRecord | null,
): ResumeImportDiff {
  const scalarChanges: ResumeScalarFieldChange[] = [];

  for (const { field, resumeKey, label } of BASICS_FIELD_MAP) {
    const current = (currentProfile?.[field] ?? null) as string | boolean | null;
    const proposed = (parsed.portfolio[resumeKey] ?? null) as string | boolean | null;
    if (current !== proposed) {
      scalarChanges.push({ field, group: 'basics', label, current, proposed });
    }
  }

  if (parsed.social_links) {
    for (const { field, label } of SOCIAL_FIELD_MAP) {
      const current = currentSocial?.[field] ?? null;
      const proposed = parsed.social_links[field] ?? null;
      if (current !== proposed) {
        scalarChanges.push({ field, group: 'social', label, current, proposed });
      }
    }
  }

  const listChanges: ResumeListItemChange[] = [
    ...parsed.workExperience.map((item, index) => ({
      key: `work:${index}`,
      group: 'workExperience' as const,
      summary: `${item.role} at ${item.company} (${item.start_date ?? '?'}–${item.end_date ?? 'present'})`,
      payload: item,
    })),
    ...parsed.skills.map((item, index) => ({
      key: `skill:${index}`,
      group: 'skills' as const,
      summary: `${item.name} — level ${item.level}`,
      payload: item,
    })),
    ...parsed.projects.map((item, index) => ({
      key: `project:${index}`,
      group: 'projects' as const,
      summary: item.title,
      payload: item,
    })),
  ];

  return {
    scalarChanges,
    listChanges,
    portfolioSlugProposed: parsed.portfolio.slug,
  };
}
