import { describe, expect, it } from 'vitest';

import { chatSearchReducer, initialChatSearchState } from '~/hooks/use-chat-search';

describe('chatSearchReducer', () => {
  it('starts closed with an empty query', () => {
    expect(initialChatSearchState).toEqual({ showSearch: false, searchQuery: '' });
  });

  it('opens the search without clearing the current query', () => {
    const opened = chatSearchReducer(initialChatSearchState, { type: 'open-search' });
    expect(opened).toEqual({ showSearch: true, searchQuery: '' });
  });

  it('sets the search query', () => {
    const next = chatSearchReducer(
      { showSearch: true, searchQuery: '' },
      { type: 'set-search-query', searchQuery: 'design' },
    );
    expect(next).toEqual({ showSearch: true, searchQuery: 'design' });
  });

  it('closes the search and clears the query', () => {
    const next = chatSearchReducer(
      { showSearch: true, searchQuery: 'design' },
      { type: 'close-search' },
    );
    expect(next).toEqual({ showSearch: false, searchQuery: '' });
  });
});
