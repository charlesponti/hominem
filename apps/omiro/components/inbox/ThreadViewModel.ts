import type { InboxStreamItem } from '@hominem/rpc/types';

export type ThreadCommon = {
  id: string;
  entityId: string;
  title: string | null;
  preview: string | null;
  updatedAt: string;
  route: string;
};

export type ThreadViewModel =
  | (ThreadCommon & { kind: 'chat'; variant: 'conversation' })
  | (ThreadCommon & { kind: 'note'; variant: 'document' });

export function toThreadViewModel(item: InboxStreamItem, route: string): ThreadViewModel {
  if (item.kind === 'chat') {
    return {
      entityId: item.entityId,
      id: item.id,
      kind: 'chat',
      preview: item.preview,
      route,
      title: item.title,
      updatedAt: item.updatedAt,
      variant: 'conversation',
    };
  }

  return {
    entityId: item.entityId,
    id: item.id,
    kind: 'note',
    preview: item.preview,
    route,
    title: item.title,
    updatedAt: item.updatedAt,
    variant: 'document',
  };
}
