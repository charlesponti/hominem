import type { RawHonoClient } from '../core/raw-client';
import type {
  PlaceAddToListsInput,
  PlaceAddToListsOutput,
  PlaceAutocompleteInput,
  PlaceAutocompleteOutput,
  PlaceCreateInput,
  PlaceCreateOutput,
  PlaceDeleteInput,
  PlaceDeleteOutput,
  PlaceDeleteVisitInput,
  PlaceDeleteVisitOutput,
  PlaceGetDetailsByGoogleIdInput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceGetDetailsByIdInput,
  PlaceGetDetailsByIdOutput,
  PlaceGetMyVisitsInput,
  PlaceGetMyVisitsOutput,
  PlaceGetNearbyFromListsInput,
  PlaceGetNearbyFromListsOutput,
  PlaceGetPlaceVisitsInput,
  PlaceGetPlaceVisitsOutput,
  PlaceGetVisitStatsInput,
  PlaceGetVisitStatsOutput,
  PlaceLogVisitInput,
  PlaceLogVisitOutput,
  PlaceRemoveFromListInput,
  PlaceRemoveFromListOutput,
  PlaceUpdateInput,
  PlaceUpdateOutput,
  PlaceUpdateVisitInput,
  PlaceUpdateVisitOutput,
} from '../types/places.types';

export interface PlacesClient {
  create(input: PlaceCreateInput): Promise<PlaceCreateOutput>;
  update(input: PlaceUpdateInput): Promise<PlaceUpdateOutput>;
  delete(input: PlaceDeleteInput): Promise<PlaceDeleteOutput>;
  autocomplete(input: PlaceAutocompleteInput): Promise<PlaceAutocompleteOutput>;
  getById(input: PlaceGetDetailsByIdInput): Promise<PlaceGetDetailsByIdOutput>;
  getByGoogleId(
    input: PlaceGetDetailsByGoogleIdInput,
  ): Promise<PlaceGetDetailsByGoogleIdOutput>;
  addToLists(input: PlaceAddToListsInput): Promise<PlaceAddToListsOutput>;
  removeFromList(input: PlaceRemoveFromListInput): Promise<PlaceRemoveFromListOutput>;
  getNearbyFromLists(
    input: PlaceGetNearbyFromListsInput,
  ): Promise<PlaceGetNearbyFromListsOutput>;
  logVisit(input: PlaceLogVisitInput): Promise<PlaceLogVisitOutput>;
  getMyVisits(input: PlaceGetMyVisitsInput): Promise<PlaceGetMyVisitsOutput>;
  getPlaceVisits(input: PlaceGetPlaceVisitsInput): Promise<PlaceGetPlaceVisitsOutput>;
  updateVisit(input: PlaceUpdateVisitInput): Promise<PlaceUpdateVisitOutput>;
  deleteVisit(input: PlaceDeleteVisitInput): Promise<PlaceDeleteVisitOutput>;
  getVisitStats(input: PlaceGetVisitStatsInput): Promise<PlaceGetVisitStatsOutput>;
}

export function createPlacesClient(rawClient: RawHonoClient): PlacesClient {
  return {
    async create(input) {
      const res = await rawClient.api.places.create.$post({ json: input });
      return res.json() as Promise<PlaceCreateOutput>;
    },
    async update(input) {
      const res = await rawClient.api.places.update.$post({ json: input });
      return res.json() as Promise<PlaceUpdateOutput>;
    },
    async delete(input) {
      const res = await rawClient.api.places.delete.$post({ json: input });
      return res.json() as Promise<PlaceDeleteOutput>;
    },
    async autocomplete(input) {
      const res = await rawClient.api.places.autocomplete.$post({ json: input });
      return res.json() as Promise<PlaceAutocompleteOutput>;
    },
    async getById(input) {
      const res = await rawClient.api.places.get.$post({ json: input });
      return res.json() as Promise<PlaceGetDetailsByIdOutput>;
    },
    async getByGoogleId(input) {
      const res = await rawClient.api.places['get-by-google-id'].$post({ json: input });
      return res.json() as Promise<PlaceGetDetailsByGoogleIdOutput>;
    },
    async addToLists(input) {
      const res = await rawClient.api.places['add-to-lists'].$post({ json: input });
      return res.json() as Promise<PlaceAddToListsOutput>;
    },
    async removeFromList(input) {
      const res = await rawClient.api.places['remove-from-list'].$post({ json: input });
      return res.json() as Promise<PlaceRemoveFromListOutput>;
    },
    async getNearbyFromLists(input) {
      const res = await rawClient.api.places.nearby.$post({ json: input });
      return res.json() as Promise<PlaceGetNearbyFromListsOutput>;
    },
    async logVisit(input) {
      const res = await rawClient.api.places['log-visit'].$post({ json: input });
      return res.json() as Promise<PlaceLogVisitOutput>;
    },
    async getMyVisits(input) {
      const res = await rawClient.api.places['my-visits'].$post({ json: input });
      return res.json() as Promise<PlaceGetMyVisitsOutput>;
    },
    async getPlaceVisits(input) {
      const res = await rawClient.api.places['place-visits'].$post({ json: input });
      return res.json() as Promise<PlaceGetPlaceVisitsOutput>;
    },
    async updateVisit(input) {
      const res = await rawClient.api.places['update-visit'].$post({ json: input });
      return res.json() as Promise<PlaceUpdateVisitOutput>;
    },
    async deleteVisit(input) {
      const res = await rawClient.api.places['delete-visit'].$post({ json: input });
      return res.json() as Promise<PlaceDeleteVisitOutput>;
    },
    async getVisitStats(input) {
      const res = await rawClient.api.places['visit-stats'].$post({ json: input });
      return res.json() as Promise<PlaceGetVisitStatsOutput>;
    },
  };
}
