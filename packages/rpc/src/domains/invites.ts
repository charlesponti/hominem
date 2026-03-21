import type { RawHonoClient } from '../core/raw-client';
import type {
  InvitesAcceptInput,
  InvitesAcceptOutput,
  InvitesCreateInput,
  InvitesCreateOutput,
  InvitesDeclineInput,
  InvitesDeclineOutput,
  InvitesDeleteInput,
  InvitesDeleteOutput,
  InvitesGetByListInput,
  InvitesGetByListOutput,
  InvitesPreviewInput,
  InvitesPreviewOutput,
  InvitesGetReceivedInput,
  InvitesGetReceivedOutput,
  InvitesGetSentInput,
  InvitesGetSentOutput,
} from '../types/invites.types';

export interface InvitesClient {
  getReceived(input: InvitesGetReceivedInput): Promise<InvitesGetReceivedOutput>;
  getSent(input: InvitesGetSentInput): Promise<InvitesGetSentOutput>;
  getByList(input: InvitesGetByListInput): Promise<InvitesGetByListOutput>;
  preview(input: InvitesPreviewInput): Promise<InvitesPreviewOutput>;
  create(input: InvitesCreateInput): Promise<InvitesCreateOutput>;
  accept(input: InvitesAcceptInput): Promise<InvitesAcceptOutput>;
  decline(input: InvitesDeclineInput): Promise<InvitesDeclineOutput>;
  delete(input: InvitesDeleteInput): Promise<InvitesDeleteOutput>;
}

export function createInvitesClient(rawClient: RawHonoClient): InvitesClient {
  return {
    async getReceived(input) {
      const res = await rawClient.api.invites.received.$post({ json: input });
      return res.json() as Promise<InvitesGetReceivedOutput>;
    },
    async getSent(input) {
      const res = await rawClient.api.invites.sent.$post({ json: input });
      return res.json() as Promise<InvitesGetSentOutput>;
    },
    async getByList(input) {
      const res = await rawClient.api.invites['by-list'].$post({ json: input });
      return res.json() as Promise<InvitesGetByListOutput>;
    },
    async preview(input) {
      const res = await rawClient.api.invites.preview.$post({ json: input });
      return res.json() as Promise<InvitesPreviewOutput>;
    },
    async create(input) {
      const res = await rawClient.api.invites.create.$post({ json: input });
      return res.json() as Promise<InvitesCreateOutput>;
    },
    async accept(input) {
      const res = await rawClient.api.invites.accept.$post({ json: input });
      return res.json() as Promise<InvitesAcceptOutput>;
    },
    async decline(input) {
      const res = await rawClient.api.invites.decline.$post({ json: input });
      return res.json() as Promise<InvitesDeclineOutput>;
    },
    async delete(input) {
      const res = await rawClient.api.invites.delete.$post({ json: input });
      return res.json() as Promise<InvitesDeleteOutput>;
    },
  };
}
