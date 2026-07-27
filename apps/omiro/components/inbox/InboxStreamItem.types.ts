import { InboxStreamItem } from '@hominem/rpc/types';

export type InboxStreamItemData = InboxStreamItem & {
  route: string;
};
