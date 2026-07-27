import type { InboxOutput } from '@hominem/rpc/types';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  getInboxItems,
  inboxEntityKeys,
  indexInboxPage,
  patchInboxEntity,
  removeInboxEntity,
} from '~/services/inbox/inbox-entities';
import { inboxKeys } from '~/services/notes/query-keys';

function makePage(): InboxOutput {
  return {
    items: [
      {
        entityId: 'note-1',
        id: 'event-1',
        kind: 'note',
        preview: 'Original preview',
        title: 'Original title',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
    ],
    nextCursor: null,
  } as InboxOutput;
}

describe('Inbox entity index', () => {
  it('stores list ordering separately from the canonical row record', () => {
    const queryClient = new QueryClient();
    const page = indexInboxPage(queryClient, makePage());
    queryClient.setQueryData(inboxKeys.page({ limit: 50 }), {
      pageParams: [null],
      pages: [page],
    });

    expect(page).toMatchObject({ itemIds: ['note:event-1'] });
    expect(queryClient.getQueryData(inboxEntityKeys.all)).toMatchObject({
      'note:event-1': { title: 'Original title' },
    });
  });

  it('updates a visible row before a background inbox refetch', () => {
    const queryClient = new QueryClient();
    const page = indexInboxPage(queryClient, makePage());
    const data = { pageParams: [null], pages: [page] };
    queryClient.setQueryData(inboxKeys.page({ limit: 50 }), data);

    patchInboxEntity(queryClient, { kind: 'note', entityId: 'note-1' }, { title: 'Saved title' });

    expect(getInboxItems(data, queryClient.getQueryData(inboxEntityKeys.all))[0]?.title).toBe(
      'Saved title',
    );
  });

  it('removes an entity from every cached page', () => {
    const queryClient = new QueryClient();
    const page = indexInboxPage(queryClient, makePage());
    queryClient.setQueryData(inboxKeys.page({ limit: 50 }), { pageParams: [null], pages: [page] });

    removeInboxEntity(queryClient, { kind: 'note', entityId: 'note-1' });

    expect(
      queryClient.getQueryData<{ pages: Array<{ itemIds: string[] }> }>(
        inboxKeys.page({ limit: 50 }),
      )?.pages[0]?.itemIds,
    ).toEqual([]);
  });
});
