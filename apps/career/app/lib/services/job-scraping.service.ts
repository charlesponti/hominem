import {
  createChatCompletion,
  getChatCompletionText,
  getChatCompletionUsage,
  type AIUsageMetrics,
} from '@hominem/ai';
import { z } from 'zod';

import extractionPrompt from './prompts/job-extraction.prompt.md?raw';

export interface JobPosting {
  job_title: string;
  companyName: string;
  companyDescription: string;
  jobDescription: string;
  location: string;
  salaryRange: string;
  salaryDetails: string;
  employmentType: string;
  experienceLevel: string;
  education: string;
  requirements: string[];
  skills: string[];
  benefits: string[];
  responsibilities: string[];
  industry: string;
  postedDate: string;
  applicationDeadline: string;
  department: string;
  hiringManager: string;
  companySize: string;
  fundingStage: string;
  technologyStack: string[];
  cultureAspects: string[];
  fullText: string;
  url: string;
  scrapedAt: string;
  wordCount: number;
}

interface JobScrapingProviderResult {
  success: boolean;
  content?: string;
  usage: AIUsageMetrics | null;
  model?: string;
  durationMs: number;
  error?: unknown;
}

const extractedJobSchema = z.object({
  job_title: z.string().optional(),
  companyName: z.string().optional(),
  companyDescription: z.string().optional(),
  jobDescription: z.string().optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  salaryDetails: z.string().optional(),
  employmentType: z.string().optional(),
  experienceLevel: z.string().optional(),
  education: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  industry: z.string().optional(),
  postedDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  department: z.string().optional(),
  hiringManager: z.string().optional(),
  companySize: z.string().optional(),
  fundingStage: z.string().optional(),
  technologyStack: z.array(z.string()).optional(),
  cultureAspects: z.array(z.string()).optional(),
  fullText: z.string().optional(),
});

export async function scrapeJobPosting(
  _userId: string,
  jobUrl: string,
): Promise<JobScrapingProviderResult> {
  const startedAt = performance.now();

  try {
    const response = await createChatCompletion({
      model: 'qwen/qwen3.5-flash-02-23',
      responseFormat: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: extractionPrompt,
        },
        {
          role: 'user',
          content: `URL: ${jobUrl}`,
        },
      ],
      tools: [{ type: 'openrouter:web_fetch' }],
    });

    return {
      success: true,
      content: getChatCompletionText(response),
      usage: getChatCompletionUsage(response),
      model: response.model,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      success: false,
      usage: null,
      durationMs: Math.round(performance.now() - startedAt),
      error,
    };
  }
}

export function parseScrapedJobPostingContent(content: string, jobUrl: string): JobPosting {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonString = jsonMatch ? jsonMatch[1].trim() : trimmed;
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(jsonString) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('not an object');
    parsed = value as Record<string, unknown>;
  } catch {
    throw new Error(
      'We couldn’t read the job details from this posting. You can retry or paste the description.',
    );
  }

  const extractedData = extractedJobSchema.safeParse(parsed);
  if (!extractedData.success) {
    throw new Error(
      'We couldn’t read the job details from this posting. You can retry or paste the description.',
    );
  }
  const fullText = extractedData.data.fullText ?? extractedData.data.jobDescription ?? '';
  const normalizedFullText = fullText.trim();

  if (
    !extractedData.data.job_title?.trim() ||
    !extractedData.data.companyName?.trim() ||
    !normalizedFullText
  ) {
    throw new Error('The page opened, but no complete job description was available.');
  }

  return {
    job_title: extractedData.data.job_title,
    companyName: extractedData.data.companyName,
    companyDescription: extractedData.data.companyDescription || '',
    jobDescription: extractedData.data.jobDescription || normalizedFullText,
    location: extractedData.data.location || '',
    salaryRange: extractedData.data.salaryRange || '',
    salaryDetails: extractedData.data.salaryDetails || '',
    employmentType: extractedData.data.employmentType || '',
    experienceLevel: extractedData.data.experienceLevel || '',
    education: extractedData.data.education || '',
    requirements: extractedData.data.requirements || [],
    skills: extractedData.data.skills || [],
    benefits: extractedData.data.benefits || [],
    responsibilities: extractedData.data.responsibilities || [],
    industry: extractedData.data.industry || '',
    postedDate: extractedData.data.postedDate || '',
    applicationDeadline: extractedData.data.applicationDeadline || '',
    department: extractedData.data.department || '',
    hiringManager: extractedData.data.hiringManager || '',
    companySize: extractedData.data.companySize || '',
    fundingStage: extractedData.data.fundingStage || '',
    technologyStack: extractedData.data.technologyStack || [],
    cultureAspects: extractedData.data.cultureAspects || [],
    fullText: normalizedFullText,
    url: jobUrl,
    scrapedAt: new Date().toISOString(),
    wordCount: normalizedFullText ? normalizedFullText.split(/\s+/).filter(Boolean).length : 0,
  };
}
