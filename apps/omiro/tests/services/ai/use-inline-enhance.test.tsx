// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockEnhance = vi.fn();
let mockIsEnhancing = false;

vi.mock('~/services/ai/use-text-enhance', () => ({
  useTextEnhance: () => ({ enhance: mockEnhance, isEnhancing: mockIsEnhancing }),
}));

const { useInlineEnhance } = await import('~/services/ai/use-inline-enhance');

describe('useInlineEnhance', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockIsEnhancing = false;
  });

  it('toggles the enhance panel open and closed, clearing any error', () => {
    const { result } = renderHook(() => useInlineEnhance());

    expect(result.current.isEnhanceOpen).toBe(false);

    act(() => {
      result.current.toggleEnhance();
    });
    expect(result.current.isEnhanceOpen).toBe(true);

    act(() => {
      result.current.toggleEnhance();
    });
    expect(result.current.isEnhanceOpen).toBe(false);
  });

  it('runs the enhancement, forwards the result, and closes the panel on success', async () => {
    mockEnhance.mockResolvedValueOnce('Enhanced text');
    const { result } = renderHook(() => useInlineEnhance());
    const onEnhanced = vi.fn();

    act(() => {
      result.current.toggleEnhance();
      result.current.setEnhanceInstruction('make it formal');
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.runEnhance({ text: 'hello', onEnhanced });
    });

    expect(success).toBe(true);
    expect(mockEnhance).toHaveBeenCalledWith({ text: 'hello', instruction: 'make it formal' });
    expect(onEnhanced).toHaveBeenCalledWith('Enhanced text');
    expect(result.current.isEnhanceOpen).toBe(false);
    expect(result.current.enhanceInstruction).toBe('');
  });

  it('prefers the explicit instruction argument over the stored enhanceInstruction', async () => {
    mockEnhance.mockResolvedValueOnce('Enhanced text');
    const { result } = renderHook(() => useInlineEnhance());

    act(() => {
      result.current.setEnhanceInstruction('stored instruction');
    });

    await act(async () => {
      await result.current.runEnhance({
        text: 'hello',
        instruction: 'explicit instruction',
        onEnhanced: vi.fn(),
      });
    });

    expect(mockEnhance).toHaveBeenCalledWith({
      text: 'hello',
      instruction: 'explicit instruction',
    });
  });

  it('does nothing and returns false for blank text', async () => {
    const { result } = renderHook(() => useInlineEnhance());
    const onEnhanced = vi.fn();

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.runEnhance({ text: '   ', onEnhanced });
    });

    expect(success).toBe(false);
    expect(mockEnhance).not.toHaveBeenCalled();
    expect(onEnhanced).not.toHaveBeenCalled();
  });

  it('returns false and does not call enhance while already enhancing', async () => {
    mockIsEnhancing = true;
    const { result } = renderHook(() => useInlineEnhance());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.runEnhance({ text: 'hello', onEnhanced: vi.fn() });
    });

    expect(success).toBe(false);
    expect(mockEnhance).not.toHaveBeenCalled();
  });

  it('sets enhanceError and returns false when enhance rejects', async () => {
    mockEnhance.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useInlineEnhance());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.runEnhance({ text: 'hello', onEnhanced: vi.fn() });
    });

    expect(success).toBe(false);
    expect(result.current.enhanceError).toBe('boom');
    expect(result.current.isEnhanceOpen).toBe(false);
  });

  it('closeEnhance clears the instruction, error, and closes the panel', async () => {
    mockEnhance.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useInlineEnhance());

    act(() => {
      result.current.toggleEnhance();
      result.current.setEnhanceInstruction('draft instruction');
    });
    await act(async () => {
      await result.current.runEnhance({ text: 'hello', onEnhanced: vi.fn() });
    });
    await waitFor(() => expect(result.current.enhanceError).toBe('boom'));

    act(() => {
      result.current.toggleEnhance();
    });
    expect(result.current.enhanceError).toBeNull();

    act(() => {
      result.current.setEnhanceInstruction('another');
      result.current.closeEnhance();
    });

    expect(result.current.isEnhanceOpen).toBe(false);
    expect(result.current.enhanceInstruction).toBe('');
    expect(result.current.enhanceError).toBeNull();
  });
});
