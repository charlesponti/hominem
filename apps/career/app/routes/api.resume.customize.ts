import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  createChatCompletion,
  getChatCompletionText,
  getChatCompletionUsage,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '@hominem/ai';
import { db, SocialLinksRepository } from '@hominem/db';
import { data, type ActionFunction } from 'react-router';
import { z } from 'zod';

import {
  jobAnalysisSchema,
  type CustomizeResumeApiRequest,
  type CustomizeResumeApiResponse,
} from '~/lib/api-contracts';

import { logger } from '../lib/logger';
import { userContext } from '../lib/middleware';
import { getResumePortfolioContext } from '../lib/portfolio.server';
import { formatPortfolioForLLM } from '../lib/utils/portfolio-formatter';

const RESUME_CUSTOMIZE_PROMPT_URL = new URL('../lib/prompts/resume-customize.md', import.meta.url);
let resumeCustomizeSystemPromptPromise: Promise<string> | null = null;

async function loadResumeCustomizeSystemPrompt(): Promise<string> {
  if (!resumeCustomizeSystemPromptPromise) {
    resumeCustomizeSystemPromptPromise = readFile(RESUME_CUSTOMIZE_PROMPT_URL, 'utf8').then(
      (content) => content.trim(),
    );
  }

  return resumeCustomizeSystemPromptPromise;
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(jsonMatch?.[1] ?? trimmed);
}

// Input validation schema
const customizeResumeSchema = z.object({
  job_posting: z.string().min(100, 'Job posting must be at least 100 characters').optional(),
  jobPostingData: z
    .object({
      job_title: z.string(),
      companyName: z.string(),
      jobDescription: z.string(),
      requirements: z.array(z.string()),
      skills: z.array(z.string()),
      fullText: z.string(),
      url: z.string(),
      scrapedAt: z.string(),
      wordCount: z.number(),
    })
    .optional(),
  resumeFormat: z
    .enum(['professional', 'modern', 'technical', 'executive'])
    .default('professional'),
  focusAreas: z.array(z.string()).optional().default([]),
  targetLength: z.enum(['concise', 'standard', 'detailed']).default('standard'),
});

export const action: ActionFunction = async ({ request, context }) => {
  try {
    const user = context.get(userContext)!;

    // Validate request method
    if (request.method !== 'POST') {
      return data({ error: 'Method not allowed' }, { status: 405 });
    }

    // Parse and validate input
    const body = (await request.json()) as CustomizeResumeApiRequest;
    const validation = customizeResumeSchema.safeParse(body);

    if (!validation.success) {
      return data(
        {
          error: 'Invalid input',
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { job_posting, jobPostingData, resumeFormat, focusAreas, targetLength } = validation.data;

    // Handle job posting input - either direct text or pre-scraped structured data
    let finalJobPosting: string;
    let jobPostingMetadata: {
      job_title?: string;
      companyName?: string;
      requirements?: string[];
      skills?: string[];
    } = {};

    if (jobPostingData) {
      finalJobPosting = jobPostingData.fullText;
      jobPostingMetadata = {
        job_title: jobPostingData.job_title,
        companyName: jobPostingData.companyName,
        requirements: jobPostingData.requirements,
        skills: jobPostingData.skills,
      };
    } else if (job_posting) {
      finalJobPosting = job_posting;
    } else {
      return data(
        { error: 'Either job_posting or jobPostingData must be provided' },
        { status: 400 },
      );
    }

    // Fetch user's portfolio data
    const portfolio = await getResumePortfolioContext(user.id);

    if (!portfolio) {
      return data(
        {
          error: 'No portfolio found. Please create your portfolio first.',
        },
        { status: 404 },
      );
    }

    const socialLinks = await SocialLinksRepository.get(db, user.id);

    // Format portfolio data for better LLM consumption using utility function
    const portfolioContext = formatPortfolioForLLM(portfolio, socialLinks);

    // Create AI prompt for resume customization
    const baseSystemPrompt = await loadResumeCustomizeSystemPrompt();
    const systemPrompt = `${baseSystemPrompt}

Resume Format: ${resumeFormat}
Target Length: ${targetLength}
${focusAreas.length > 0 ? `Focus Areas: ${focusAreas.join(', ')}` : ''}`;

    const userPrompt = `JOB POSTING:
${finalJobPosting}

USER PORTFOLIO DATA:
${portfolioContext}

Please create a customized resume that highlights the most relevant experience and skills for this specific job opportunity.`;

    // Generate customized resume using the shared monorepo AI client
    const resumeEventId = randomUUID();
    const getResumeDurationMs = startAIUsageTimer();
    let result;
    try {
      result = await createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 4000,
        temperature: 0.3,
      });
    } catch (error) {
      await recordAIUsageEvent({
        eventId: resumeEventId,
        userId: user.id,
        feature: 'career_resume_customize',
        operation: 'chat_completion',
        status: 'failed',
        error,
        durationMs: getResumeDurationMs(),
        metadata: { call: 'resume_generation' },
      });
      throw error;
    }
    await recordAIUsageEvent({
      eventId: resumeEventId,
      userId: user.id,
      feature: 'career_resume_customize',
      operation: 'chat_completion',
      usage: getChatCompletionUsage(result),
      model: result.model,
      status: 'succeeded',
      durationMs: getResumeDurationMs(),
      metadata: {
        hasStructuredJobPosting: Boolean(jobPostingData),
        resumeFormat,
        targetLength,
        focusAreasCount: focusAreas.length,
        jobPostingWordCount: finalJobPosting.split(/\s+/).filter(Boolean).length,
        call: 'resume_generation',
      },
    });

    // Extract key insights from the job posting for additional context
    const analysisEventId = randomUUID();
    const getAnalysisDurationMs = startAIUsageTimer();
    let analysisResult;
    try {
      analysisResult = await createChatCompletion({
        responseFormat: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an expert job posting analyzer. Return only valid JSON with requiredSkills, qualifications, cultureKeywords, and recommendedKeywords arrays.',
          },
          {
            role: 'user',
            content: `Analyze this job posting and extract the most important information:

${finalJobPosting}`,
          },
        ],
        temperature: 0.1,
      });
    } catch (error) {
      await recordAIUsageEvent({
        eventId: analysisEventId,
        userId: user.id,
        feature: 'career_resume_customize',
        operation: 'structured_output',
        status: 'failed',
        error,
        durationMs: getAnalysisDurationMs(),
        metadata: { call: 'job_analysis' },
      });
      throw error;
    }
    await recordAIUsageEvent({
      eventId: analysisEventId,
      userId: user.id,
      feature: 'career_resume_customize',
      operation: 'structured_output',
      usage: getChatCompletionUsage(analysisResult),
      model: analysisResult.model,
      status: 'succeeded',
      durationMs: getAnalysisDurationMs(),
      metadata: {
        hasStructuredJobPosting: Boolean(jobPostingData),
        resumeFormat,
        targetLength,
        focusAreasCount: focusAreas.length,
        jobPostingWordCount: finalJobPosting.split(/\s+/).filter(Boolean).length,
        call: 'job_analysis',
      },
    });

    const parsedAnalysis = parseJsonObject(getChatCompletionText(analysisResult));
    const analysisValidation = jobAnalysisSchema.safeParse(parsedAnalysis);

    if (!analysisValidation.success) {
      logger.warn('Failed to parse job analysis with schema', {
        owner_userid: user.id,
        issues: analysisValidation.error.issues,
      });
    }

    const responseData: CustomizeResumeApiResponse = {
      customizedResume: getChatCompletionText(result),
      jobAnalysis: analysisValidation.success ? analysisValidation.data : null,
      metadata: {
        format: resumeFormat,
        targetLength,
        focusAreas,
        generatedAt: new Date().toISOString(),
        portfolio_id: user.id,
        job_posting_word_count: finalJobPosting.split(/\s+/).length,
        jobPostingMetadata,
      },
    };

    return responseData;
  } catch (error) {
    logger.error(
      'Resume customization error',
      error instanceof Error ? error : undefined,
      error instanceof Error ? undefined : { error },
    );

    return data({ error: 'Unable to customize resume' }, { status: 500 });
  }
};
