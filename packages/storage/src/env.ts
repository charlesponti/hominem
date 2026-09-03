import { createServerEnv } from '@hominem/env';
import { runtimeSchema } from '@hominem/env/runtime';
import { storageSchema } from '@hominem/env/storage';

export const env = createServerEnv(runtimeSchema.extend(storageSchema.shape), 'storage');

export type StorageEnv = typeof env;
