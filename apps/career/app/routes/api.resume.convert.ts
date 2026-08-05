import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  createChatCompletion,
  getChatCompletionText,
  getChatCompletionUsage,
  OpenRouterRequestError,
} from '@hominem/ai';
import { db, CareerRepository } from '@hominem/db';
import { recordAIUsageEvent, startAIUsageTimer } from '@hominem/services';
import {
  documentStorageService,
  isStorageServiceError,
  resolveUploadMimeType,
  validateFile,
} from '@hominem/storage';
import { data, type ActionFunction } from 'react-router';
import { z } from 'zod';

import type { UploadResumeApiResponse } from '../lib/api-contracts';
import { logger } from '../lib/logger';
import { userContext } from '../lib/middleware';
import { getRateLimitHeaders, resumeConvertRateLimit } from '../lib/rate-limit';
import { extractPdfText } from '../lib/services/pdf-text.server';
import { saveResumeToDatabase } from '../lib/services/resume-conversion.service';
import type { ConvertedResumeData, ResumeConvertStage } from '../types/resume';
import { resumeSchema } from '../types/resume';

const MAX_EXTRACTED_RESUME_TEXT_LENGTH = 80_000;
const PDF_RESUME_VALIDATION = {
  maxSizeBytes: 10 * 1024 * 1024,
  allowedTypes: ['application/pdf'],
} as const;
const RESUME_PARSER_PROMPT_URL = new URL('../lib/prompts/resume-parser.md', import.meta.url);
let resumeParserSystemPromptPromise: Promise<string> | null = null;
const resumeParserJsonSchema = z.toJSONSchema(resumeSchema);

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

function errorResponse(
  error: string,
  status: number,
  stage: ResumeConvertStage,
  retryable: boolean,
  extra?: Omit<UploadResumeApiResponse, 'error' | 'stage' | 'retryable'>,
  headers?: HeadersInit,
): ReturnType<typeof data<UploadResumeApiResponse>> {
  return data({ error, stage, retryable, ...extra } satisfies UploadResumeApiResponse, {
    status,
    headers,
  });
}

function logRouteError(message: string, error: unknown, context?: Record<string, unknown>): void {
  const errorContext =
    error instanceof OpenRouterRequestError
      ? {
          ...context,
          ai_error: {
            status: error.status,
            statusText: error.statusText,
            code: error.code,
            providerMessage: error.providerMessage,
            details: error.details,
          },
        }
      : context;

  logger.error(
    message || (error instanceof Error ? error.message : ''),
    error instanceof Error ? error : undefined,
    errorContext,
  );
}

function resolveAiParseFailure(error: unknown) {
  if (error instanceof OpenRouterRequestError) {
    if (error.code === 'missing_api_key') {
      return {
        error: 'Resume parsing AI is not configured yet. Set OPENROUTER_API_KEY and try again.',
        status: 503,
      };
    }

    if (error.status === 401 || error.status === 402 || error.status === 403) {
      return {
        error:
          'Resume parsing AI is unavailable because the provider credentials were rejected. Check the AI service configuration and try again.',
        status: 502,
      };
    }

    if (error.status === 429) {
      return {
        error: 'Resume parsing AI is temporarily rate limited. Wait a moment and try again.',
        status: 503,
      };
    }
  }

  return {
    error: 'Could not parse the resume with AI right now. Try again in a moment.',
    status: 502,
  };
}

function resolveStorageFailure(error: unknown) {
  if (!isStorageServiceError(error)) {
    return {
      error: 'Could not store the resume file. Check the storage configuration and try again.',
      details: undefined,
    };
  }

  switch (error.code) {
    case 'storage.config.missing':
      return {
        error:
          'Resume storage is not configured yet. Check the storage configuration and try again.',
        details: error.details,
      };
    case 'storage.credentials.invalid':
      return {
        error:
          'Resume storage credentials were rejected. Check the Cloudflare R2 configuration and try again.',
        details: error.details,
      };
    case 'storage.bucket.access_denied':
      return {
        error:
          'Resume storage access was denied. Check the Cloudflare R2 bucket permissions and try again.',
        details: error.details,
      };
    case 'storage.bucket.missing':
      return {
        error:
          'Resume storage bucket was not found. Check the Cloudflare R2 bucket name and try again.',
        details: error.details,
      };
    case 'storage.network.unreachable':
      return {
        error: 'Resume storage is temporarily unreachable. Try again in a moment.',
        details: error.details,
      };
    default:
      return {
        error: 'Could not store the resume file. Check the storage configuration and try again.',
        details: error.details,
      };
  }
}

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(userContext)!;
  let ownerUserid: string | undefined = user.id;

  try {
    const rateLimit = resumeConvertRateLimit.isAllowed(user.id);
    const rateLimitHeaders = getRateLimitHeaders(rateLimit, resumeConvertRateLimit);
    if (!rateLimit.allowed) {
      return errorResponse(
        'Too many resume conversion attempts. Try again later.',
        429,
        'rate-limit',
        true,
        {
          rateLimit: {
            limit: resumeConvertRateLimit.maxRequests,
            remaining: rateLimit.remaining,
            reset: Math.ceil(rateLimit.resetTime / 1000),
          },
        },
        rateLimitHeaders,
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(
        'Upload must be sent as multipart form data with a PDF file.',
        400,
        'request',
        true,
      );
    }

    const formData = await request.formData();
    const pdfField = formData.get('pdf');
    const storedFileIdField = formData.get('fileId');
    const replaceExisting = formData.get('replaceExisting') === 'true';
    let existingPortfolio: { id: string } | null = null;

    // One portfolio per user: create only when none exists; otherwise require replace.
    existingPortfolio = await CareerRepository.getProfile(db, user.id);
    if (existingPortfolio && !replaceExisting) {
      return errorResponse(
        'You already have a portfolio. Replace it from your account or work page instead of creating another.',
        409,
        'request',
        false,
      );
    }
    if (replaceExisting && !existingPortfolio) {
      return errorResponse(
        'No existing portfolio was found to replace. Create a portfolio first.',
        404,
        'request',
        false,
      );
    }

    let file: File;
    let uploadResult: { id: string; url: string };

    if (typeof storedFileIdField === 'string' && storedFileIdField.trim()) {
      // Re-convert an already stored PDF (no second upload).
      const fileId = storedFileIdField.trim();
      const bytes = await documentStorageService.getFile(fileId, user.id);
      if (!bytes) {
        return errorResponse(
          'That file was not found. It may have been deleted.',
          404,
          'file-validation',
          false,
        );
      }
      const listed = await documentStorageService.listUserFiles(user.id);
      const meta = listed.find((entry) => entry.name.startsWith(fileId));
      const fileName = meta?.name ?? `${fileId}.pdf`;
      file = new File([Buffer.from(bytes)], fileName, { type: 'application/pdf' });
      const fileUrl = (await documentStorageService.getFileUrl(fileId, user.id)) ?? '';
      uploadResult = { id: fileId, url: fileUrl };
    } else if (pdfField instanceof File) {
      file = pdfField;

      const validation = validateFile(file, PDF_RESUME_VALIDATION);
      if (!validation.valid) {
        return errorResponse(
          validation.error ?? 'The selected file is not a valid resume PDF.',
          400,
          'file-validation',
          true,
        );
      }
      const uploadMimeType = resolveUploadMimeType(file);

      // Persist the PDF first so a later extract/AI/DB failure does not lose the file.
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        uploadResult = await documentStorageService.storeFile(buffer, uploadMimeType, user.id, {
          originalName: file.name,
        });
      } catch (error) {
        const failure = resolveStorageFailure(error);
        logger.error('Resume file upload failed', undefined, {
          ownerUserid: user.id,
          fileName: file.name,
          error: isStorageServiceError(error)
            ? error.code
            : error instanceof Error
              ? error.message
              : error,
          ...(failure.details ? { storage: failure.details } : {}),
        });
        return errorResponse(failure.error, 503, 'storage', true);
      }
    } else {
      return errorResponse(
        'No PDF file was attached. Choose a resume PDF and try again.',
        400,
        'file-validation',
        true,
      );
    }

    const storedFile = { fileUrl: uploadResult.url, fileId: uploadResult.id };

    let pdfText: string;
    try {
      pdfText = await extractPdfText(file);
    } catch (error) {
      logRouteError('Resume PDF text extraction failed', error, {
        ownerUserid: user.id,
        fileName: file.name,
        fileSize: file.size,
        ...storedFile,
      });
      return errorResponse(
        'Could not read text from this PDF. Try a searchable PDF instead of a scanned or password-protected file. Your PDF was saved so you can retry.',
        400,
        'pdf-extraction',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    if (!pdfText.trim()) {
      return errorResponse(
        'This PDF did not contain readable text. Upload a searchable resume PDF instead of a scanned image. Your PDF was saved so you can retry.',
        400,
        'pdf-extraction',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    if (pdfText.length > MAX_EXTRACTED_RESUME_TEXT_LENGTH) {
      return errorResponse(
        'This resume contains too much text to process safely. Try a shorter resume PDF. Your PDF was saved so you can retry.',
        400,
        'pdf-extraction',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    let aiContent: string;
    const resumeParserSystemPrompt = await loadResumeParserSystemPrompt();
    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();
    try {
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
          {
            role: 'system',
            content: resumeParserSystemPrompt,
          },
          {
            role: 'user',
            content: `Parse this resume into structured JSON. Resume text:\n${pdfText}`,
          },
        ],
      });
      await recordAIUsageEvent({
        eventId,
        userId: user.id,
        feature: 'career_resume_convert',
        operation: 'structured_output',
        usage: getChatCompletionUsage(result),
        model: result.model,
        status: 'succeeded',
        durationMs: getDurationMs(),
        metadata: {
          fileId: uploadResult.id,
          extractedCharacterCount: pdfText.length,
          replaceExisting,
        },
      });
      aiContent = getChatCompletionText(result);
    } catch (error) {
      await recordAIUsageEvent({
        eventId,
        userId: user.id,
        feature: 'career_resume_convert',
        operation: 'structured_output',
        status: 'failed',
        error,
        durationMs: getDurationMs(),
        metadata: {
          extractedCharacterCount: pdfText.length,
          replaceExisting,
        },
      });
      logRouteError('Resume AI parsing request failed', error, {
        ownerUserid: user.id,
        fileName: file.name,
        ...storedFile,
      });
      const failure = resolveAiParseFailure(error);
      return errorResponse(failure.error, failure.status, 'ai-parse', true, {
        fileUrl: uploadResult.url,
      });
    }

    if (!aiContent.trim()) {
      logger.error('Resume AI parsing returned empty content', undefined, {
        ownerUserid: user.id,
        fileName: file.name,
        ...storedFile,
      });
      return errorResponse(
        'The AI parser returned an empty response. Try again, or upload a simpler resume PDF. Your PDF was saved so you can retry.',
        502,
        'ai-parse',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    let parsedResume: unknown;
    try {
      parsedResume = parseJsonObject(aiContent);
    } catch (error) {
      logRouteError('Resume AI parsing returned invalid JSON', error, {
        ownerUserid: user.id,
        fileName: file.name,
        ...storedFile,
      });
      return errorResponse(
        'The AI parser returned malformed resume data. Try again, or upload a simpler resume PDF. Your PDF was saved so you can retry.',
        502,
        'ai-parse',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    const {
      success,
      data,
      error: schemaError,
    } = resumeSchema.safeParse(parsedResume as ConvertedResumeData);
    if (!success) {
      logger.error('Resume AI parsing failed schema validation', undefined, {
        ownerUserid: user.id,
        fileName: file.name,
        issues: schemaError.issues,
        ...storedFile,
      });
      return errorResponse(
        'The parsed resume data was incomplete or invalid. Try again, or update the PDF with clearer resume sections. Your PDF was saved so you can retry.',
        422,
        'schema-validation',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    let portfolioId: string;
    let portfolioSlug: string;
    try {
      const saveResult = await saveResumeToDatabase(user.id, data, {
        replaceProfileId: replaceExisting ? (existingPortfolio?.id ?? undefined) : undefined,
      });
      portfolioId = saveResult.profileId;
      portfolioSlug = saveResult.profileSlug;
    } catch (error) {
      logRouteError('Resume database save failed', error, {
        ownerUserid: user.id,
        fileName: file.name,
        ...storedFile,
      });
      // Keep the stored PDF — do not delete on portfolio save failure.
      return errorResponse(
        'Your PDF was saved, but saving the portfolio failed. Check the database connection and migrations, then try again.',
        500,
        'database',
        true,
        { fileUrl: uploadResult.url },
      );
    }

    return {
      message: 'Resume uploaded and processed successfully',
      data,
      saved: true,
      portfolio_id: portfolioId,
      portfolioSlug,
      portfolioUrl: `/p/${portfolioSlug}`,
      fileUrl: uploadResult.url,
      stage: 'complete',
      retryable: false,
    } satisfies UploadResumeApiResponse;
  } catch (err) {
    logRouteError('Resume conversion request failed before processing', err, { ownerUserid });

    return errorResponse(
      'Could not start resume conversion. Please try again.',
      500,
      'request',
      true,
    );
  }
};
