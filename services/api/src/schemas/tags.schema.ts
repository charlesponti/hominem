import * as z from 'zod';

// ── shared ───────────────────────────────────────────────────────────

// Entity types this tool surface currently supports. Grows incrementally as
// later migration phases add more taggable domains (see
// application/tags.service.ts's ENTITY_TABLE_MAP) — not a generic passthrough
// to arbitrary table names, since entity_table casts straight to a Postgres
// regclass.
export const entityTypeSchema = z.enum(['people', 'places', 'possessions']);

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// ── tag_entity ───────────────────────────────────────────────────────

export const tagEntityInputSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  tagName: z.string().trim().min(1).max(100),
});

export const tagEntityOutputSchema = z.object({
  tag: tagSchema,
});

// ── untag_entity ─────────────────────────────────────────────────────

export const untagEntityInputSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  tagId: z.string().uuid(),
});

export const untagEntityOutputSchema = z.object({
  removed: z.boolean(),
});

// ── entity_tags ──────────────────────────────────────────────────────

export const entityTagsInputSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
});

export const entityTagsOutputSchema = z.object({
  tags: z.array(tagSchema),
  count: z.number().int().min(0),
});
