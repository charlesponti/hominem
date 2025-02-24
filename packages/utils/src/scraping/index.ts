import AirbnbListingSchema from './airbnb.schema'
import { JobPostingSchema } from './job-posting.schema'

export const SITE_SCHEMAS = {
  'airbnb-listing': AirbnbListingSchema,
  'job-posting': JobPostingSchema,
}
export type AVAILABLE_SCHEMAS = keyof typeof SITE_SCHEMAS
