import type { z } from 'zod';

import type { JobPostingSchema } from './job-posting.schema';

import { SITE_SCHEMAS } from '.';
import { transformHTMLToSchema } from './html-transformer';

export async function getJobPostingFromHTML(html: string): Promise<{
  object: z.infer<typeof JobPostingSchema>;
  duration: number;
}> {
  const schema = SITE_SCHEMAS['job-posting'];
  return transformHTMLToSchema(html, schema);
}
