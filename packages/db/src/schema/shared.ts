import * as z from 'zod'

const AccountMetadataValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
export const AccountMetadataSchema = z.record(z.string(), AccountMetadataValueSchema)

export interface TransactionLocation {
  address?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
  lat?: number | null
  lon?: number | null
}
