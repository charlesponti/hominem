import { z } from 'zod';

import {
  itemsAddToListSchema,
  itemsRemoveFromListSchema,
  itemsGetByListIdSchema,
} from '../routes/items';

export type {
  ItemsAddToListOutput,
  ItemsRemoveFromListOutput,
  ItemsGetByListIdOutput,
} from '../lib/typed-routes';

export type ItemsAddToListInput = z.infer<typeof itemsAddToListSchema>;
export type ItemsRemoveFromListInput = z.infer<typeof itemsRemoveFromListSchema>;
export type ItemsGetByListIdInput = z.infer<typeof itemsGetByListIdSchema>;
