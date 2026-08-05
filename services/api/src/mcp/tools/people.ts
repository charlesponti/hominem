import { getPersonPeople } from '../../application/people.service';
import { peopleLookupInputSchema, peopleLookupOutputSchema } from '../../schemas/people.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'people_lookup',
    title: 'People lookup',
    description:
      'Searches people by name or alias and returns a summary with contact info, organizations, and tags.',
    inputSchema: peopleLookupInputSchema,
    outputSchema: peopleLookupOutputSchema,
    readOnly: true,
    scopes: ['people:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) =>
    getPersonPeople({ ownerUserId, query: input.query, limit: input.limit }),
);
