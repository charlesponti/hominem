import { describe, expect, it } from 'vitest';

import { computeChatLoadState } from './compute-chat-load-state';

const base = {
  messagesStatus: 200,
  isNotFound: false,
  hasError: false,
  isLoading: false,
  isFetching: false,
  messageCount: 0,
};

describe('computeChatLoadState', () => {
  it('reports not-found when the loader 404s or the query flags it missing', () => {
    expect(computeChatLoadState({ ...base, messagesStatus: 404 })).toEqual({
      kind: 'not-found',
    });
    expect(computeChatLoadState({ ...base, isNotFound: true })).toEqual({ kind: 'not-found' });
  });

  it('reports error when the messages query has failed', () => {
    expect(computeChatLoadState({ ...base, hasError: true })).toEqual({ kind: 'error' });
  });

  it('reports initial for a first load with no cached messages yet', () => {
    expect(computeChatLoadState({ ...base, isLoading: true })).toEqual({ kind: 'initial' });
    expect(computeChatLoadState({ ...base, isFetching: true, messageCount: 0 })).toEqual({
      kind: 'initial',
    });
  });

  it('reports ready without restoring once messages are on screen and settled', () => {
    expect(computeChatLoadState({ ...base, messageCount: 3 })).toEqual({
      kind: 'ready',
      isRestoring: false,
    });
  });

  it('reports ready with isRestoring true for a resumed chat revalidating in the background', () => {
    expect(computeChatLoadState({ ...base, isFetching: true, messageCount: 3 })).toEqual({
      kind: 'ready',
      isRestoring: true,
    });
  });
});
