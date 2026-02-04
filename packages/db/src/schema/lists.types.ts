import type {
  ListInput,
  ListOutput,
  UserListsInput,
  UserListsOutput,
  ListInviteInput,
  ListInviteOutput,
} from './lists.schema';

export type {
  ListInput,
  ListOutput,
  UserListsInput,
  UserListsOutput,
  ListInviteInput,
  ListInviteOutput,
};

// Backward compatibility aliases
export type ListSelect = ListOutput;
export type ListInviteSelect = ListInviteOutput;
