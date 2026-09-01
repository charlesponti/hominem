// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStreamdownPlugins } from './use-streamdown-plugins';

describe('useStreamdownPlugins', () => {
  it('starts empty and fills in with the loaded plugins', async () => {
    const { result } = renderHook(() => useStreamdownPlugins());

    expect(result.current).toEqual({});

    await waitFor(
      () => {
        expect(result.current.cjk).toBeDefined();
        expect(result.current.code).toBeDefined();
        expect(result.current.math).toBeDefined();
        expect(result.current.mermaid).toBeDefined();
      },
      { timeout: 5000 },
    );
  });
});
