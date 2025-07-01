import type { RouterOutput } from '~/lib/trpc'

// Derive types from tRPC instead of defining them locally
export type CategoryBreakdownItem = RouterOutput['finance']['analyze']['categoryBreakdown'][0]
export type TopMerchantItem = RouterOutput['finance']['analyze']['topMerchants'][0]
