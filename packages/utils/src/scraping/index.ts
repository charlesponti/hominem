export * from './browser'
export * from './html-transformer'
export { getJobPostingFromHTML } from './job-posting.utils'
export { parseLinkedinJobUrl } from './linkedin.utils'
export * from './queries'
export * from './scraping.utils'
import AirbnbListingSchema from './airbnb.schema'
import { JobPostingSchema } from './job-posting.schema'

export const SITE_SCHEMAS = {
  'airbnb-listing': AirbnbListingSchema,
  'job-posting': JobPostingSchema,
}
export type AVAILABLE_SCHEMAS = keyof typeof SITE_SCHEMAS
