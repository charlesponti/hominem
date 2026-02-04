import type { EmptyInput } from './utils';

export type UserDeleteAccountInput = EmptyInput;
export type UserDeleteAccountOutput = {
  success: boolean;
  error?: string | undefined;
};
