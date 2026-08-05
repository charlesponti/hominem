// @vitest-environment node

import { OpenRouterRequestError } from '@hominem/ai';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCareerTestDb } from '~/test/db/career';
import { makeConvertedResumeData } from '~/test/factories/resume';

import { userContext } from '../lib/middleware';

const mocks = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  documentStorageService: {
    storeFile: vi.fn(),
    deleteFile: vi.fn(),
    getFileUrl: vi.fn(),
    listUserFiles: vi.fn(),
    getFile: vi.fn(),
  },
  extractPdfText: vi.fn(),
  getRateLimitHeaders: vi.fn(),
  isRateLimitAllowed: vi.fn(),
  logError: vi.fn(),
  resolveUploadMimeType: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  saveResumeToDatabase: vi.fn(),
  validateFile: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    error: mocks.logError,
  },
}));

vi.mock('@hominem/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/storage')>();
  return {
    ...actual,
    documentStorageService: mocks.documentStorageService,
    resolveUploadMimeType: mocks.resolveUploadMimeType,
    validateFile: mocks.validateFile,
  };
});

vi.mock('../lib/services/resume-conversion.service', () => ({
  saveResumeToDatabase: mocks.saveResumeToDatabase,
}));

vi.mock('../lib/services/pdf-text.server', () => ({
  extractPdfText: mocks.extractPdfText,
}));

vi.mock('../lib/rate-limit', () => ({
  resumeConvertRateLimit: {
    maxRequests: 3,
    isAllowed: mocks.isRateLimitAllowed,
  },
  getRateLimitHeaders: mocks.getRateLimitHeaders,
}));

vi.mock('@hominem/services', () => ({
  recordAIUsageEvent: mocks.recordAIUsageEvent,
  startAIUsageTimer: () => () => 0,
}));

vi.mock('@hominem/ai', () => ({
  OpenRouterRequestError: class OpenRouterRequestError extends Error {
    status?: number;
    statusText?: string;
    code?: string;

    constructor(
      message: string,
      options: { status?: number; statusText?: string; code?: string } = {},
    ) {
      super(message);
      this.name = 'OpenRouterRequestError';
      this.status = options.status;
      this.statusText = options.statusText;
      this.code = options.code;
    }
  },
  createChatCompletion: mocks.createCompletion,
  getChatCompletionText: vi.fn(
    (result: { choices?: Array<{ message?: { content?: string } }> }) =>
      result.choices?.[0]?.message?.content ?? '',
  ),
  getChatCompletionUsage: vi.fn((result: { model?: string; usage?: Record<string, unknown> }) => ({
    provider: 'openrouter',
    model: result.model ?? 'test-model',
    promptTokens: Number(result.usage?.promptTokens ?? 0),
    completionTokens: Number(result.usage?.completionTokens ?? 0),
    totalTokens: Number(result.usage?.totalTokens ?? 0),
    reportedTotalTokens: null,
    costUsd: result.usage && 'cost' in result.usage ? Number(result.usage.cost ?? 0) : null,
    cachedPromptTokens: null,
    reasoningTokens: null,
  })),
}));

let action: typeof import('./api.resume.convert').action;
const testDb = createCareerTestDb();

beforeAll(async () => {
  ({ action } = await import('./api.resume.convert'));
});

afterEach(async () => {
  await testDb.cleanup();
});

function pdfFile(): File {
  return new File(['pdf'], 'resume.pdf', { type: 'application/pdf' });
}

function pdfFileWithoutMime(): File {
  return new File(['pdf'], 'resume.pdf', { type: '' });
}

function formRequest(file?: File, options?: { replaceExisting?: boolean }): Request {
  const formData = new FormData();
  if (file) formData.set('pdf', file);
  if (options?.replaceExisting) formData.set('replaceExisting', 'true');

  return new Request('http://localhost/api/resume/convert', {
    method: 'POST',
    body: formData,
  });
}

function toRouteResponse(result: unknown): Response {
  if (result instanceof Response) {
    return result;
  }

  if (
    result &&
    typeof result === 'object' &&
    'type' in result &&
    result.type === 'DataWithResponseInit' &&
    'data' in result
  ) {
    const init =
      'init' in result && result.init && typeof result.init === 'object' ? result.init : undefined;

    return Response.json(result.data, init as ResponseInit | undefined);
  }

  return Response.json(result);
}

const DEFAULT_TEST_USER = { id: 'user-id', email: 'user@example.com', name: 'Test User' };

function makeContext(user: typeof DEFAULT_TEST_USER | null = DEFAULT_TEST_USER) {
  const { RouterContextProvider } = require('react-router');
  const ctx = new RouterContextProvider([[userContext, user]]);
  return ctx;
}

async function callAction(
  request: Request,
  user: typeof DEFAULT_TEST_USER | null = DEFAULT_TEST_USER,
): Promise<Response> {
  const result = await action({
    request,
    params: {},
    context: makeContext(user),
    url: new URL(request.url),
    pattern: '/api/resume/convert',
  });

  return toRouteResponse(result);
}

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

async function createExistingPortfolio() {
  const { user, profile } = await testDb.createProfile({
    slug: 'existing',
    title: 'Existing Portfolio',
  });
  return { user, profile };
}

describe('resume convert action', () => {
  beforeEach(() => {
    mocks.isRateLimitAllowed.mockReturnValue({
      allowed: true,
      remaining: 2,
      resetTime: 1_893_456_000_000,
    });
    mocks.getRateLimitHeaders.mockImplementation(
      (result: { remaining: number; resetTime: number }) => ({
        'X-RateLimit-Limit': '3',
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      }),
    );
    mocks.validateFile.mockReturnValue({ valid: true });
    mocks.resolveUploadMimeType.mockImplementation((file: File) => {
      const type = file.type === 'application/octet-stream' ? '' : file.type;
      return type || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
    });
    mocks.extractPdfText.mockResolvedValue('resume text');
    mocks.createCompletion.mockResolvedValue({
      model: 'test-model',
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20, cost: 0.2 },
      choices: [{ message: { content: JSON.stringify(makeConvertedResumeData()) } }],
    });
    mocks.documentStorageService.storeFile.mockResolvedValue({
      id: 'file-id',
      url: '/files/file-id',
    });
    mocks.documentStorageService.deleteFile.mockResolvedValue(true);
    mocks.recordAIUsageEvent.mockResolvedValue(undefined);
    mocks.saveResumeToDatabase.mockResolvedValue({
      profileId: 'portfolio-id',
      profileSlug: 'charles-ponti',
    });
  });

  it('returns request stage when the body is not multipart', async () => {
    const response = await callAction(
      new Request('http://localhost/api/resume/convert', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }),
    );
    const body = await responseBody(response);

    expect(response.status).toBe(400);
    expect(body.stage).toBe('request');
  });

  it('returns rate limit stage before parsing multipart requests', async () => {
    mocks.isRateLimitAllowed.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetTime: 1_893_456_000_000,
    });

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(body.stage).toBe('rate-limit');
    expect(body.rateLimit).toMatchObject({ limit: 3, remaining: 0 });
    expect(mocks.extractPdfText).not.toHaveBeenCalled();
    expect(mocks.createCompletion).not.toHaveBeenCalled();
    expect(mocks.documentStorageService.storeFile).not.toHaveBeenCalled();
  });

  it('returns file validation stage when no file is attached', async () => {
    const response = await callAction(formRequest());
    const body = await responseBody(response);

    expect(response.status).toBe(400);
    expect(body.stage).toBe('file-validation');
  });

  it('returns file validation stage when file validation fails', async () => {
    mocks.validateFile.mockReturnValue({ valid: false, error: 'Invalid PDF' });

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(400);
    expect(body.stage).toBe('file-validation');
    expect(body.error).toBe('Invalid PDF');
  });

  it('rejects create when the user already has a portfolio', async () => {
    const { user } = await createExistingPortfolio();

    const response = await callAction(formRequest(pdfFile()), user);
    const body = await responseBody(response);

    expect(response.status).toBe(409);
    expect(body.stage).toBe('request');
    expect(body.error).toMatch(/already have a portfolio/i);
    expect(mocks.extractPdfText).not.toHaveBeenCalled();
    expect(mocks.createCompletion).not.toHaveBeenCalled();
    expect(mocks.saveResumeToDatabase).not.toHaveBeenCalled();
  });

  it('continues conversion when replacement is requested from the account page', async () => {
    const existing = await createExistingPortfolio();

    const response = await callAction(
      formRequest(pdfFile(), { replaceExisting: true }),
      existing.user,
    );
    const body = await responseBody(response);

    expect(response.status).toBe(200);
    expect(body.stage).toBe('complete');
    expect(mocks.extractPdfText).toHaveBeenCalledTimes(1);
    expect(mocks.saveResumeToDatabase).toHaveBeenCalledWith(existing.user.id, expect.any(Object), {
      replaceProfileId: existing.profile.id,
    });
  });

  it('returns pdf extraction stage when text extraction fails', async () => {
    mocks.extractPdfText.mockRejectedValue(new Error('pdf failed'));

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(400);
    expect(body.stage).toBe('pdf-extraction');
  });

  it('returns pdf extraction stage when extracted text is empty', async () => {
    mocks.extractPdfText.mockResolvedValue('   ');

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(400);
    expect(body.stage).toBe('pdf-extraction');
  });

  it('returns pdf extraction stage when extracted text is too large', async () => {
    mocks.extractPdfText.mockResolvedValue('x'.repeat(80_001));

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(400);
    expect(body.stage).toBe('pdf-extraction');
    expect(mocks.createCompletion).not.toHaveBeenCalled();
  });

  it('tells the AI to preserve resume bullet points in work experience descriptions', async () => {
    const response = await callAction(formRequest(pdfFile()));
    expect(response.status).toBe(200);

    expect(mocks.createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: expect.objectContaining({
          type: 'json_schema',
          jsonSchema: expect.objectContaining({
            name: 'resume_parser',
            strict: true,
          }),
        }),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('preserve the resume bullet points'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.not.stringContaining('JSON.stringify'),
          }),
        ]),
      }),
    );
  });

  it('returns ai parse stage when the AI request fails', async () => {
    mocks.createCompletion.mockRejectedValue(new Error('ai failed'));

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(502);
    expect(body.stage).toBe('ai-parse');
  });

  it('returns a provider credential message when the ai provider rejects the request', async () => {
    mocks.createCompletion.mockRejectedValue(
      new OpenRouterRequestError('Provider returned error', {
        status: 401,
        statusText: 'Unauthorized',
      }),
    );

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(502);
    expect(body.stage).toBe('ai-parse');
    expect(body.error).toBe(
      'Resume parsing AI is unavailable because the provider credentials were rejected. Check the AI service configuration and try again.',
    );
  });

  it('returns a configuration message when the ai api key is missing', async () => {
    mocks.createCompletion.mockRejectedValue(
      new OpenRouterRequestError('OPENROUTER_API_KEY is required', {
        code: 'missing_api_key',
      }),
    );

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(503);
    expect(body.stage).toBe('ai-parse');
    expect(body.error).toBe(
      'Resume parsing AI is not configured yet. Set OPENROUTER_API_KEY and try again.',
    );
  });

  it('returns ai parse stage when the AI response is malformed JSON', async () => {
    mocks.createCompletion.mockResolvedValue({
      model: 'model',
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20, cost: 0.42 },
      choices: [{ message: { content: '{' } }],
    });

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(502);
    expect(body.stage).toBe('ai-parse');
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'career_resume_convert',
        operation: 'structured_output',
        usage: expect.objectContaining({ totalTokens: 20, costUsd: 0.42 }),
      }),
    );
  });

  it('returns schema validation stage when the parsed resume is invalid', async () => {
    mocks.createCompletion.mockResolvedValue({
      model: 'model',
      usage: { promptTokens: 9, completionTokens: 7, totalTokens: 16, cost: 0.31 },
      choices: [{ message: { content: JSON.stringify({ portfolio: { email: 'not-an-email' } }) } }],
    });

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(422);
    expect(body.stage).toBe('schema-validation');
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'career_resume_convert',
        usage: expect.objectContaining({ totalTokens: 16, costUsd: 0.31 }),
      }),
    );
  });

  it('returns schema validation stage when required parsed fields are blank', async () => {
    mocks.createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(makeConvertedResumeData({ portfolio: { title: '   ' } })),
          },
        },
      ],
    });

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(422);
    expect(body.stage).toBe('schema-validation');
    expect(mocks.documentStorageService.storeFile).toHaveBeenCalledTimes(1);
    expect(body.fileUrl).toBe('/files/file-id');
  });

  it('normalizes present dates before saving', async () => {
    mocks.createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...makeConvertedResumeData(),
              workExperience: [
                {
                  company: 'Company',
                  role: 'Engineer',
                  description: 'Built things',
                  start_date: '2020-01',
                  end_date: 'Present',
                },
              ],
            }),
          },
        },
      ],
    });

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(200);
    expect(
      (body.data as ReturnType<typeof makeConvertedResumeData>).workExperience[0],
    ).toMatchObject({
      start_date: '2020-01-01',
      end_date: null,
    });
  });

  it('passes normalized pdf MIME type to storage when file type is missing', async () => {
    const response = await callAction(formRequest(pdfFileWithoutMime()));

    expect(response.status).toBe(200);
    expect(mocks.documentStorageService.storeFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'application/pdf',
      'user-id',
      {
        originalName: 'resume.pdf',
      },
    );
  });

  it('returns storage stage when upload fails', async () => {
    mocks.documentStorageService.storeFile.mockRejectedValue(new Error('storage failed'));

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(503);
    expect(body.stage).toBe('storage');
    expect(body.error).toMatch(/storage/i);
  });

  it('returns database stage when saving fails and keeps the stored PDF', async () => {
    mocks.saveResumeToDatabase.mockRejectedValue(new Error('db failed'));

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(500);
    expect(body.stage).toBe('database');
    expect(body.fileUrl).toBe('/files/file-id');
    expect(mocks.documentStorageService.storeFile).toHaveBeenCalledTimes(1);
    expect(mocks.documentStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('stores the PDF before AI parse failures', async () => {
    mocks.createCompletion.mockRejectedValue(new Error('ai down'));

    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(502);
    expect(body.stage).toBe('ai-parse');
    expect(mocks.documentStorageService.storeFile).toHaveBeenCalledTimes(1);
    expect(body.fileUrl).toBe('/files/file-id');
    expect(mocks.documentStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('returns portfolio metadata when conversion succeeds', async () => {
    const response = await callAction(formRequest(pdfFile()));
    const body = await responseBody(response);

    expect(response.status).toBe(200);
    expect(body.stage).toBe('complete');
    expect(body.portfolio_id).toBe('portfolio-id');
    expect(body.portfolioSlug).toBe('charles-ponti');
    expect(body.portfolioUrl).toBe('/p/charles-ponti');
    expect(body.fileUrl).toBe('/files/file-id');
  });
});
