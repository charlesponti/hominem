import { describe, expect, it } from 'vitest';

import { getUploadErrorMessage, parseApiErrorResponse } from './use-file-upload';

describe('parseApiErrorResponse', () => {
  it('accepts a complete structured API error', () => {
    expect(
      parseApiErrorResponse({
        error: 'upload_failed',
        code: 'FILE_TOO_LARGE',
        message: 'The file is too large.',
        details: { limit: 10 },
      }),
    ).toEqual({
      error: 'upload_failed',
      code: 'FILE_TOO_LARGE',
      message: 'The file is too large.',
      details: { limit: 10 },
    });
  });

  it('drops non-record, incomplete, and non-record details values', () => {
    expect(parseApiErrorResponse(null)).toBeNull();
    expect(parseApiErrorResponse('failed')).toBeNull();
    expect(parseApiErrorResponse({ error: 'failed' })).toBeNull();
    expect(
      parseApiErrorResponse({
        error: 'upload_failed',
        code: 'UNKNOWN',
        message: 'Failed.',
        details: 'not-an-object',
      }),
    ).toEqual({ error: 'upload_failed', code: 'UNKNOWN', message: 'Failed.' });
  });
});

describe('getUploadErrorMessage', () => {
  it('normalizes errors, strings, message objects, and fallback values', () => {
    expect(getUploadErrorMessage(new Error('network down'))).toBe('network down');
    expect(getUploadErrorMessage('server failed')).toBe('server failed');
    expect(getUploadErrorMessage({ message: 'invalid file' })).toBe('invalid file');
    expect(getUploadErrorMessage({ message: 500 })).toBe('[object Object]');
    expect(getUploadErrorMessage(null)).toBe('Upload failed');
    expect(getUploadErrorMessage(undefined)).toBe('Upload failed');
  });
});
