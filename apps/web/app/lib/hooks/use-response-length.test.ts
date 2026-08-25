// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useResponseLength } from './use-response-length';

const STORAGE_KEY = 'hominem:response-length';

afterEach(() => {
  window.localStorage.clear();
});

describe('useResponseLength', () => {
  it('defaults to medium and safely ignores an invalid stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'verbose');

    const { result } = renderHook(() => useResponseLength());

    expect(result.current.responseLength).toBe('medium');
  });

  it('restores a valid preference and persists later selections', () => {
    window.localStorage.setItem(STORAGE_KEY, 'short');
    const { result } = renderHook(() => useResponseLength());

    expect(result.current.responseLength).toBe('short');

    act(() => result.current.setResponseLength('long'));
    expect(result.current.responseLength).toBe('long');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('long');
  });

  it('falls back to medium when a selection is invalid', () => {
    const { result } = renderHook(() => useResponseLength());

    act(() => result.current.setResponseLength('verbose'));
    expect(result.current.responseLength).toBe('medium');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('medium');
  });
});
