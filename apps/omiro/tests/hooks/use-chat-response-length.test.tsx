// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockMmkvModule } from '../mocks/mmkv';

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

const { useChatResponseLength, getChatResponseLength, setChatResponseLength } =
  await import('~/hooks/use-chat-response-length');

describe('useChatResponseLength', () => {
  afterEach(() => {
    setChatResponseLength('medium');
  });

  it('defaults to medium when nothing is stored', () => {
    expect(getChatResponseLength()).toBe('medium');
    const { result } = renderHook(() => useChatResponseLength());
    expect(result.current).toBe('medium');
  });

  it('reflects a stored value', () => {
    setChatResponseLength('long');
    const { result } = renderHook(() => useChatResponseLength());
    expect(result.current).toBe('long');
  });

  it('ignores an invalid stored value and falls back to the default', async () => {
    const { storage } = await import('~/services/storage/mmkv');
    storage.set('chat_response_length', 'extra-long');
    expect(getChatResponseLength()).toBe('medium');
  });

  it('reflects an external value change once the component re-renders', () => {
    const { result, rerender } = renderHook(() => useChatResponseLength());
    expect(result.current).toBe('medium');

    act(() => {
      setChatResponseLength('short');
    });
    rerender();

    expect(result.current).toBe('short');
  });
});
