import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { list, listInvite, userLists } from './tables';

export type ListInput = InferInsertModel<typeof list>;
export type ListOutput = InferSelectModel<typeof list>;
export type UserListsInput = InferInsertModel<typeof userLists>;
export type UserListsOutput = InferSelectModel<typeof userLists>;
export type ListInviteInput = InferInsertModel<typeof listInvite>;
export type ListInviteOutput = InferSelectModel<typeof listInvite>;

// Backward compatibility aliases
export type ListSelect = ListOutput;
export type ListInviteSelect = ListInviteOutput;
