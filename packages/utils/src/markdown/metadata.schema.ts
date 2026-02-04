import { z } from 'zod';

export const MetadataSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    date: z.string().optional(),
    category: z.string().optional(),
  })
  .passthrough();

export type Metadata = z.infer<typeof MetadataSchema>;

export function extractMetadata(data: Record<string, unknown>): Metadata {
  try {
    return MetadataSchema.parse(data);
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {};
  }
}
