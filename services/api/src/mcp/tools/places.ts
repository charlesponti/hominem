import { getPlaceVisitHistory } from '../../application/places.service';
import {
  placeVisitHistoryInputSchema,
  placeVisitHistoryOutputSchema,
} from '../../schemas/places.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'place_visit_history',
    title: 'Place visit history',
    description:
      "Lists visits to places (restaurants, venues, addresses), newest first, with the visited place's name and address.",
    inputSchema: placeVisitHistoryInputSchema,
    outputSchema: placeVisitHistoryOutputSchema,
    readOnly: true,
    scopes: ['places:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => getPlaceVisitHistory(ownerUserId, input),
);
