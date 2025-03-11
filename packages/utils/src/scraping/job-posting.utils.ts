import type { z } from 'zod'
import { SITE_SCHEMAS } from '.'
import { transformHTMLToSchema } from './html-transformer'
import type { JobPostingSchema } from './job-posting.schema'

export async function getJobPostingFromHTML(html: string): Promise<{
  object: z.infer<typeof JobPostingSchema>
  duration: number
}> {
  const schema = SITE_SCHEMAS['job-posting']
  return transformHTMLToSchema(html, schema)
}
