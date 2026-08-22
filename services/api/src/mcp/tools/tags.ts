import {
  getEntityDisplayName,
  getTagName,
  listEntityTags,
  tagEntity,
  untagEntity,
} from '../../application/tags.service';
import {
  entityTagsInputSchema,
  entityTagsOutputSchema,
  tagEntityInputSchema,
  tagEntityOutputSchema,
  untagEntityInputSchema,
  untagEntityOutputSchema,
} from '../../schemas/tags.schema';
import { registerTool } from '../tools';

registerTool(
  {
    name: 'tag_entity',
    title: 'Tag an entity',
    description:
      'Tags a person or place with a named tag, creating the tag if it does not already exist.',
    inputSchema: tagEntityInputSchema,
    outputSchema: tagEntityOutputSchema,
    readOnly: false,
    scopes: ['tags:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => tagEntity(ownerUserId, input),
);

registerTool(
  {
    name: 'untag_entity',
    title: 'Untag an entity',
    description: 'Removes a tag from a person or place.',
    inputSchema: untagEntityInputSchema,
    outputSchema: untagEntityOutputSchema,
    readOnly: false,
    scopes: ['tags:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
    requiresConfirmation: true,
    preview: async (ownerUserId, input) => {
      const parsed = untagEntityInputSchema.safeParse(input);
      if (!parsed.success) return null;
      const [tagName, entityName] = await Promise.all([
        getTagName(ownerUserId, parsed.data.tagId),
        getEntityDisplayName(ownerUserId, parsed.data.entityType, parsed.data.entityId),
      ]);
      return {
        tag: tagName ?? '(unknown tag)',
        entity: entityName ?? `${parsed.data.entityType.slice(0, -1)} (unknown)`,
      };
    },
  },
  async (ownerUserId, input) => untagEntity(ownerUserId, input),
);

registerTool(
  {
    name: 'entity_tags',
    title: 'List tags on an entity',
    description: 'Lists the tags currently assigned to a person or place.',
    inputSchema: entityTagsInputSchema,
    outputSchema: entityTagsOutputSchema,
    readOnly: true,
    scopes: ['tags:read'],
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  async (ownerUserId, input) => listEntityTags(ownerUserId, input),
);
