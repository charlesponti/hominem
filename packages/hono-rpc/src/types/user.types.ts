import type { ApiResult } from '@hominem/services';
import type { EmptyInput } from './utils';

export type UserDeleteAccountInput = EmptyInput;
export type UserDeleteAccountOutput = ApiResult<{ success: true }>;
