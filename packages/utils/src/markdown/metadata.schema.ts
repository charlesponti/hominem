import * as z from 'zod';

export const MetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  created: z.iso.datetime().optional(),
  // modified: z.iso.datetime().optional(),
  status: z.enum(['draft', 'review', 'published']).optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  priority: z.number().min(0).max(5).optional(),
  topics: z.array(z.string()).optional(),
  references: z.array(z.string().url()).optional(),
  isPrivate: z.boolean().optional(),
  language: z.string().length(2).optional(), // ISO 639-1 language code
  version: z.string().optional(),
  license: z.string().optional(),
  wordCount: z.number().optional(),
  readingTime: z.number().optional(), // in minutes
});

export type Metadata = z.infer<typeof MetadataSchema>;

export function extractMetadata(frontmatter: Record<string, unknown>): Metadata {
  const result = MetadataSchema.safeParse(frontmatter);
  return result.success ? result.data : {};
}
