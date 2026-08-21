import { describe, expect, it } from 'vitest';

import {
  hasDefinedData,
  hasNonEmptyListData,
  resolveRestoredQueryState,
} from '~/services/query/restored-query-state';

describe('resolveRestoredQueryState', () => {
  it('treats cached chat messages as ready while a refetch is pending', () => {
    expect(
      resolveRestoredQueryState({
        data: [{ id: 'msg-1' }],
        isPending: false,
        isFetching: true,
        isReady: hasNonEmptyListData,
      }),
    ).toEqual({
      isReady: true,
      isInitialLoading: false,
      isRefreshing: true,
    });
  });

  it('keeps the inbox in first-load mode until it has usable items', () => {
    expect(
      resolveRestoredQueryState({
        data: undefined,
        isPending: true,
        isFetching: true,
        isReady: hasNonEmptyListData,
      }),
    ).toEqual({
      isReady: false,
      isInitialLoading: true,
      isRefreshing: false,
    });
  });

  it('treats a cached note as render-ready during background sync', () => {
    expect(
      resolveRestoredQueryState({
        data: { id: 'note-1', title: 'Draft' },
        isPending: false,
        isFetching: true,
        isReady: hasDefinedData,
      }),
    ).toEqual({
      isReady: true,
      isInitialLoading: false,
      isRefreshing: true,
    });
  });
});
