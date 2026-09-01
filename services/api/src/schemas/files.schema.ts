import { z } from 'zod';

export const UploadMetadataSchema = z.object({
  originalName: z.string().min(1),
  mimetype: z.string().min(1),
});
