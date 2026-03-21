import type { RawHonoClient } from '../core/raw-client';
import type {
  ListCreateInput,
  ListCreateOutput,
  ListDeleteInput,
  ListDeleteItemInput,
  ListDeleteItemOutput,
  ListDeleteOutput,
  ListGetAllInput,
  ListGetAllOutput,
  ListGetByIdInput,
  ListGetByIdOutput,
  ListGetContainingPlaceInput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorInput,
  ListRemoveCollaboratorOutput,
  ListUpdateInput,
  ListUpdateOutput,
} from '../types/lists.types';

export interface ListsClient {
  getAll(input: ListGetAllInput): Promise<ListGetAllOutput>;
  getById(input: ListGetByIdInput): Promise<ListGetByIdOutput>;
  create(input: ListCreateInput): Promise<ListCreateOutput>;
  update(input: ListUpdateInput): Promise<ListUpdateOutput>;
  delete(input: ListDeleteInput): Promise<ListDeleteOutput>;
  deleteItem(input: ListDeleteItemInput): Promise<ListDeleteItemOutput>;
  getContainingPlace(input: ListGetContainingPlaceInput): Promise<ListGetContainingPlaceOutput>;
  removeCollaborator(
    input: ListRemoveCollaboratorInput,
  ): Promise<ListRemoveCollaboratorOutput>;
}

export function createListsClient(rawClient: RawHonoClient): ListsClient {
  return {
    async getAll(input) {
      const res = await rawClient.api.lists.list.$post({ json: input });
      return res.json() as Promise<ListGetAllOutput>;
    },
    async getById(input) {
      const res = await rawClient.api.lists.get.$post({ json: input });
      return res.json() as Promise<ListGetByIdOutput>;
    },
    async create(input) {
      const res = await rawClient.api.lists.create.$post({ json: input });
      return res.json() as Promise<ListCreateOutput>;
    },
    async update(input) {
      const res = await rawClient.api.lists.update.$post({ json: input });
      return res.json() as Promise<ListUpdateOutput>;
    },
    async delete(input) {
      const res = await rawClient.api.lists.delete.$post({ json: input });
      return res.json() as Promise<ListDeleteOutput>;
    },
    async deleteItem(input) {
      const res = await rawClient.api.lists['delete-item'].$post({ json: input });
      return res.json() as Promise<ListDeleteItemOutput>;
    },
    async getContainingPlace(input) {
      const res = await rawClient.api.lists['containing-place'].$post({ json: input });
      return res.json() as Promise<ListGetContainingPlaceOutput>;
    },
    async removeCollaborator(input) {
      const res = await rawClient.api.lists['remove-collaborator'].$post({ json: input });
      return res.json() as Promise<ListRemoveCollaboratorOutput>;
    },
  };
}
