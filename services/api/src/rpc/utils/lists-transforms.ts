import type { ListOutput } from '@hominem/lists-services';
import type { ListItem } from '@hominem/rpc/types/items.types';
import type { List, ListUser } from '@hominem/rpc/types/lists.types';

type ListTransformInput = ListOutput & {
  items?: ListItem[];
};

type ListTransformUser = NonNullable<ListOutput['users']>[number];

function normalizeUser(user: ListTransformUser): ListUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    image: user.image ?? undefined,
  };
}

function normalizeCreatedBy(createdBy: ListOutput['createdBy']): List['createdBy'] {
  if (!createdBy) {
    return null;
  }

  return {
    id: createdBy.id,
    email: createdBy.email,
    name: createdBy.name ?? undefined,
  };
}

export function transformListToApiFormat(list: ListTransformInput): List {
  return {
    ...list,
    createdBy: normalizeCreatedBy(list.createdBy),
    users: list.users?.map(normalizeUser),
    items: list.items,
  };
}
