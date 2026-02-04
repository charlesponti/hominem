import type {
  List,
  ListInsert,
  ListSelect,
  ListInsertSchemaType,
  ListSelectSchemaType,
  UserLists,
  UserListsInsert,
  UserListsSelect,
  UserListsInsertSchemaType,
  UserListsSelectSchemaType,
  ListInvite,
  ListInviteInsert,
  ListInviteSelect,
  ListInviteInsertSchemaType,
  ListInviteSelectSchemaType,
} from './lists.schema';

export type {
  List,
  ListInsert,
  ListSelect,
  ListInsertSchemaType,
  ListSelectSchemaType,
  UserLists,
  UserListsInsert,
  UserListsSelect,
  UserListsInsertSchemaType,
  UserListsSelectSchemaType,
  ListInvite,
  ListInviteInsert,
  ListInviteSelect,
  ListInviteInsertSchemaType,
  ListInviteSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type ListOutput = List;
export type ListInput = ListInsert;

export type UserListsOutput = UserLists;
export type UserListsInput = UserListsInsert;

export type ListInviteOutput = ListInvite;
export type ListInviteInput = ListInviteInsert;
