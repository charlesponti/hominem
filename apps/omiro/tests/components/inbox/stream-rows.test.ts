import { describe, expect, it } from 'vitest';

import type { InboxStreamItemData } from '~/components/inbox/InboxStreamItem.types';
import { getEnteringItemIds, type StreamRow } from '~/components/inbox/stream-rows';

function item(id: string): InboxStreamItemData {
  return {
    id,
    entityId: id,
    title: id,
    preview: null,
    updatedAt: new Date().toISOString(),
    route: `/notes/${id}`,
    kind: 'note',
    variant: 'document',
  };
}

function row(id: string): StreamRow {
  return { type: 'row', key: id, item: item(id) };
}

function header(key: string): StreamRow {
  return { type: 'header', key, label: key };
}

describe('getEnteringItemIds', () => {
  it('returns the leading run of unseen ids for a new capture at the top', () => {
    const rows = [header('header-today'), row('new-1'), row('old-1'), row('old-2')];

    expect(getEnteringItemIds(rows, new Set(['old-1', 'old-2']))).toEqual(new Set(['new-1']));
  });

  it('returns every id in a multi-item unseen run at the top', () => {
    const rows = [row('new-1'), row('new-2'), row('old-1')];

    expect(getEnteringItemIds(rows, new Set(['old-1']))).toEqual(new Set(['new-1', 'new-2']));
  });

  it('ignores pagination appends below already-seen rows', () => {
    const rows = [row('old-1'), row('old-2'), row('page-2-a'), row('page-2-b')];

    expect(getEnteringItemIds(rows, new Set(['old-1', 'old-2']))).toEqual(new Set());
  });

  it('returns empty when everything was seen, so filter switches mount static', () => {
    const rows = [header('header-today'), row('a'), row('b')];

    expect(getEnteringItemIds(rows, new Set(['a', 'b']))).toEqual(new Set());
  });

  it('returns empty when a seen item reorders to the top', () => {
    const rows = [row('bumped'), row('other')];

    expect(getEnteringItemIds(rows, new Set(['bumped', 'other']))).toEqual(new Set());
  });

  it('skips headers without breaking the leading run', () => {
    const rows = [header('header-today'), row('new-1'), header('header-old'), row('old-1')];

    expect(getEnteringItemIds(rows, new Set(['old-1']))).toEqual(new Set(['new-1']));
  });
});
