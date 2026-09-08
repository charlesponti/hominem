import { describe, expect, it } from 'vitest';

import { NotFoundError, ServiceError, isServiceError } from './errors';

describe('isServiceError', () => {
  it('accepts a real ServiceError instance', () => {
    expect(isServiceError(new NotFoundError('Chat', { chatId: '1' }))).toBe(true);
  });

  it('accepts a duck-typed object with the same shape (e.g. crossed a serialization boundary)', () => {
    expect(isServiceError({ message: 'Chat not found', code: 'NOT_FOUND', statusCode: 404 })).toBe(
      true,
    );
  });

  it('rejects an unknown error code', () => {
    expect(isServiceError({ message: 'oops', code: 'SOMETHING_ELSE', statusCode: 404 })).toBe(
      false,
    );
  });

  it('rejects a statusCode outside the 400-599 range', () => {
    expect(isServiceError({ message: 'ok', code: 'NOT_FOUND', statusCode: 200 })).toBe(false);
  });

  it('rejects a non-integer statusCode', () => {
    expect(isServiceError({ message: 'ok', code: 'NOT_FOUND', statusCode: 404.5 })).toBe(false);
  });

  it('rejects when a required field is missing', () => {
    expect(isServiceError({ code: 'NOT_FOUND', statusCode: 404 })).toBe(false);
  });

  it('rejects a plain Error', () => {
    expect(isServiceError(new Error('plain'))).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isServiceError(null)).toBe(false);
    expect(isServiceError(undefined)).toBe(false);
    expect(isServiceError('not an object')).toBe(false);
  });

  it('ignores an unvalidated details field', () => {
    expect(
      isServiceError({
        message: 'ok',
        code: 'NOT_FOUND',
        statusCode: 404,
        details: 'not a record',
      }),
    ).toBe(true);
  });
});

describe('ServiceError', () => {
  it('sets name to the concrete subclass name', () => {
    expect(new NotFoundError('Chat').name).toBe('NotFoundError');
  });

  it('is an instance of both ServiceError and Error', () => {
    const error = new NotFoundError('Chat');
    expect(error).toBeInstanceOf(ServiceError);
    expect(error).toBeInstanceOf(Error);
  });
});
