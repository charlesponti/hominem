import { randomUUID } from 'node:crypto';

import { CareerRepository, db } from '@hominem/db';
import {
  createImportJob,
  resumeAnalysisQueue,
  type ResumeAnalysisJob,
  type ResumeAnalysisQueuePayload,
} from '@hominem/queues';
import {
  documentStorageService,
  isStorageServiceError,
  resolveUploadMimeType,
  validateFile,
} from '@hominem/storage';
import { data, type ActionFunction } from 'react-router';

import { logger } from '../lib/logger';
import { userContext } from '../lib/middleware';
import { getRateLimitHeaders, resumeConvertRateLimit } from '../lib/rate-limit';

const PDF_RESUME_VALIDATION = {
  maxSizeBytes: 10 * 1024 * 1024,
  allowedTypes: ['application/pdf'],
} as const;

export interface StartResumeAnalysisResponse {
  jobId?: string;
  fileUrl?: string;
  error?: string;
}

function errorResponse(
  error: string,
  status: number,
  headers?: HeadersInit,
): ReturnType<typeof data<StartResumeAnalysisResponse>> {
  return data({ error } satisfies StartResumeAnalysisResponse, { status, headers });
}

function resolveStorageFailure(error: unknown): string {
  if (!isStorageServiceError(error)) {
    return 'Could not store the resume file. Check the storage configuration and try again.';
  }

  switch (error.code) {
    case 'storage.config.missing':
      return 'Resume storage is not configured yet. Check the storage configuration and try again.';
    case 'storage.credentials.invalid':
      return 'Resume storage credentials were rejected. Check the Cloudflare R2 configuration and try again.';
    case 'storage.bucket.access_denied':
      return 'Resume storage access was denied. Check the Cloudflare R2 bucket permissions and try again.';
    case 'storage.bucket.missing':
      return 'Resume storage bucket was not found. Check the Cloudflare R2 bucket name and try again.';
    case 'storage.network.unreachable':
      return 'Resume storage is temporarily unreachable. Try again in a moment.';
    default:
      return 'Could not store the resume file. Check the storage configuration and try again.';
  }
}

export const action: ActionFunction = async ({ request, context }) => {
  const user = context.get(userContext)!;

  try {
    const rateLimit = resumeConvertRateLimit.isAllowed(user.id);
    const rateLimitHeaders = getRateLimitHeaders(rateLimit, resumeConvertRateLimit);
    if (!rateLimit.allowed) {
      return errorResponse(
        'Too many resume analysis attempts. Try again later.',
        429,
        rateLimitHeaders,
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Upload must be sent as multipart form data with a PDF file.', 400);
    }

    const formData = await request.formData();
    const pdfField = formData.get('pdf');
    const storedFileIdField = formData.get('fileId');

    const existingProfile = await CareerRepository.getProfile(db, user.id);
    const mode: ResumeAnalysisQueuePayload['mode'] = existingProfile ? 'replace' : 'create';

    let fileId: string;
    let fileUrl: string;

    if (typeof storedFileIdField === 'string' && storedFileIdField.trim()) {
      // Re-analyze an already-stored PDF (the "Convert" action on a past upload).
      fileId = storedFileIdField.trim();
      const bytes = await documentStorageService.getFile(fileId, user.id);
      if (!bytes) {
        return errorResponse('That file was not found. It may have been deleted.', 404);
      }
      fileUrl = (await documentStorageService.getFileUrl(fileId, user.id)) ?? '';
    } else if (pdfField instanceof File) {
      const validation = validateFile(pdfField, PDF_RESUME_VALIDATION);
      if (!validation.valid) {
        return errorResponse(
          validation.error ?? 'The selected file is not a valid resume PDF.',
          400,
        );
      }

      const uploadMimeType = resolveUploadMimeType(pdfField);
      try {
        const buffer = Buffer.from(await pdfField.arrayBuffer());
        const uploadResult = await documentStorageService.storeFile(
          buffer,
          uploadMimeType,
          user.id,
          {
            originalName: pdfField.name,
          },
        );
        fileId = uploadResult.id;
        fileUrl = uploadResult.url;
      } catch (error) {
        logger.error('Resume file upload failed', undefined, {
          ownerUserid: user.id,
          fileName: pdfField.name,
          error: isStorageServiceError(error)
            ? error.code
            : error instanceof Error
              ? error.message
              : error,
        });
        return errorResponse(resolveStorageFailure(error), 503);
      }
    } else {
      return errorResponse('No PDF file was attached. Choose a resume PDF and try again.', 400);
    }

    const jobId = randomUUID();
    const now = Date.now();

    await createImportJob<ResumeAnalysisJob>({
      jobId,
      userId: user.id,
      type: 'resume-analysis',
      status: 'queued',
      stage: 'queued',
      fileId,
      mode,
      startTime: now,
    });

    const payload: ResumeAnalysisQueuePayload = {
      jobId,
      userId: user.id,
      fileId,
      mode,
      existingProfileId: existingProfile?.id,
      createdAt: now,
    };
    await resumeAnalysisQueue.add('resume-analysis', payload, { jobId });

    return { jobId, fileUrl } satisfies StartResumeAnalysisResponse;
  } catch (error) {
    logger.error(
      'Resume analysis request failed before processing',
      error instanceof Error ? error : undefined,
      {
        ownerUserid: user.id,
      },
    );
    return errorResponse('Could not start resume analysis. Please try again.', 500);
  }
};
