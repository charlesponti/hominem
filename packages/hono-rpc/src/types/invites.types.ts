import { z } from 'zod';

import type { EmptyInput } from './utils';

import {
  invitesGetReceivedSchema,
  invitesGetByListSchema,
  invitesCreateSchema,
  invitesAcceptSchema,
  invitesDeclineSchema,
  invitesDeleteSchema,
} from '../routes/invites';

export type {
  InvitesGetReceivedOutput,
  InvitesGetSentOutput,
  InvitesGetByListOutput,
  InvitesCreateOutput,
  InvitesAcceptOutput,
  InvitesDeclineOutput,
  InvitesDeleteOutput,
} from '../lib/typed-routes';

export type InvitesGetReceivedInput = z.infer<typeof invitesGetReceivedSchema>;
export type InvitesGetSentInput = EmptyInput;
export type InvitesGetByListInput = z.infer<typeof invitesGetByListSchema>;
export type InvitesCreateInput = z.infer<typeof invitesCreateSchema>;
export type InvitesAcceptInput = z.infer<typeof invitesAcceptSchema>;
export type InvitesDeclineInput = z.infer<typeof invitesDeclineSchema>;
export type InvitesDeleteInput = z.infer<typeof invitesDeleteSchema>;
