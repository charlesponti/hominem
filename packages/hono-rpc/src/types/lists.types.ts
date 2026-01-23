import { z } from 'zod';

import {
  listGetAllSchema,
  listGetByIdSchema,
  listCreateSchema,
  listUpdateSchema,
  listDeleteSchema,
  listDeleteItemSchema,
  listGetContainingPlaceSchema,
  listRemoveCollaboratorSchema,
} from '../routes/lists';

export type {
  ListGetAllOutput,
  ListGetByIdOutput,
  ListCreateOutput,
  ListUpdateOutput,
  ListDeleteOutput,
  ListDeleteItemOutput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorOutput,
} from '../lib/typed-routes';

export type ListGetAllInput = z.infer<typeof listGetAllSchema>;
export type ListGetByIdInput = z.infer<typeof listGetByIdSchema>;
export type ListCreateInput = z.infer<typeof listCreateSchema>;
export type ListUpdateInput = z.infer<typeof listUpdateSchema>;
export type ListDeleteInput = z.infer<typeof listDeleteSchema>;
export type ListDeleteItemInput = z.infer<typeof listDeleteItemSchema>;
export type ListGetContainingPlaceInput = z.infer<typeof listGetContainingPlaceSchema>;
export type ListRemoveCollaboratorInput = z.infer<typeof listRemoveCollaboratorSchema>;
