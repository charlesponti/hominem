// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockEnhancePost = vi.fn();

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    api: { enhance: { enhance: { $post: mockEnhancePost } } },
  }),
}));

const { useTextEnhance } = await import('~/services/ai/use-text-enhance');

describe('useTextEnhance', () => {
  it('posts the text without an instruction and returns the enhanced text', async () => {
    mockEnhancePost.mockResolvedValueOnce({ json: async () => ({ text: 'Enhanced text' }) });
    const { result } = renderHook(() => useTextEnhance());

    let enhanced: string | undefined;
    await act(async () => {
      enhanced = await result.current.enhance({ text: 'raw text' });
    });

    expect(mockEnhancePost).toHaveBeenCalledWith({ json: { text: 'raw text' } });
    expect(enhanced).toBe('Enhanced text');
  });

  it('includes the instruction in the request payload when provided', async () => {
    mockEnhancePost.mockResolvedValueOnce({ json: async () => ({ text: 'Enhanced text' }) });
    const { result } = renderHook(() => useTextEnhance());

    await act(async () => {
      await result.current.enhance({ text: 'raw text', instruction: 'make it formal' });
    });

    expect(mockEnhancePost).toHaveBeenCalledWith({
      json: { text: 'raw text', instruction: 'make it formal' },
    });
  });

  it('toggles isEnhancing around the request and resets it even when the request fails', async () => {
    let resolveRequest: (() => void) | undefined;
    mockEnhancePost.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          resolveRequest = () => reject(new Error('network error'));
        }),
    );
    const { result } = renderHook(() => useTextEnhance());

    let enhancePromise: Promise<string> | undefined;
    act(() => {
      enhancePromise = result.current.enhance({ text: 'raw text' });
    });

    await waitFor(() => expect(result.current.isEnhancing).toBe(true));

    act(() => {
      resolveRequest?.();
    });

    await act(async () => {
      await expect(enhancePromise).rejects.toThrow('network error');
    });

    expect(result.current.isEnhancing).toBe(false);
  });
});
