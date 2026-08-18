import { randomUUID } from 'node:crypto';

import { recordAIUsageEvent } from '@hominem/ai';
import { data, type ActionFunction } from 'react-router';

import type { JobScrapeApiRequest, JobScrapeApiResponse } from '~/lib/api-contracts';
import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';
import {
  parseScrapedJobPostingContent,
  scrapeJobPosting,
} from '~/lib/services/job-scraping.service';

export const action: ActionFunction = async ({ request, context }) => {
  try {
    const user = context.get(userContext);
    if (!user) {
      return data({ error: 'Authentication required' }, { status: 401 });
    }

    const { url: jobUrl } = (await request.json()) as JobScrapeApiRequest;

    if (!jobUrl) {
      return data({ error: 'Job posting URL is required' }, { status: 400 });
    }

    try {
      new URL(jobUrl);
    } catch {
      return data({ error: 'Invalid URL format' }, { status: 400 });
    }

    const eventId = randomUUID();
    const result = await scrapeJobPosting(user.id, jobUrl);

    if (!result.success) {
      await recordAIUsageEvent({
        eventId,
        userId: user.id,
        feature: 'career_job_scrape',
        operation: 'structured_output',
        model: result.model,
        durationMs: result.durationMs,
        status: 'failed',
        error: result.error,
        metadata: {
          source: 'job_url',
        },
      });
      return data(
        {
          error:
            'We couldn’t read the job details from this posting. You can retry or paste the description.',
        } satisfies JobScrapeApiResponse,
        { status: 400 },
      );
    }

    await recordAIUsageEvent({
      eventId,
      userId: user.id,
      feature: 'career_job_scrape',
      operation: 'structured_output',
      usage: result.usage,
      model: result.model,
      status: 'succeeded',
      durationMs: result.durationMs,
      metadata: {
        source: 'job_url',
      },
    });

    try {
      return {
        job_posting: parseScrapedJobPostingContent(result.content ?? '', jobUrl),
      } satisfies JobScrapeApiResponse;
    } catch (error) {
      logger.error('Job scraping response parsing failed', error, {
        owner_userid: user.id,
        jobUrl: new URL(jobUrl).hostname,
      });
      return data(
        {
          error:
            'We couldn’t read the job details from this posting. You can retry or paste the description.',
        } satisfies JobScrapeApiResponse,
        { status: 400 },
      );
    }
  } catch (error) {
    logger.error(
      'Job scraping API error',
      error instanceof Error ? error : undefined,
      error instanceof Error ? undefined : { error },
    );

    return data({ error: 'Unable to scrape job posting' } satisfies JobScrapeApiResponse, {
      status: 500,
    });
  }
};
