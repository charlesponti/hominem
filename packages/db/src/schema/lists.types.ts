import type {
  List,
  ListInsert,
  ListSelect,
  UserLists,
  UserListsInsert,
  UserListsSelect,
  ListInvite,
  ListInviteInsert,
  ListInviteSelect,
} from './lists.schema';

export type {
  List,
  ListInsert,
  ListSelect,
  UserLists,
  UserListsInsert,
  UserListsSelect,
  ListInvite,
  ListInviteInsert,
  ListInviteSelect,
};

// Legacy aliases for backward compatibility
export type ListOutput = List;
export type ListInput = ListInsert;

export type UserListsOutput = UserLists;
export type UserListsInput = UserListsInsert;

export type ListInviteOutput = ListInvite;
export type ListInviteInput = ListInviteInsert;
