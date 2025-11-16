import { createContentRouter } from '@hominem/notes'
import { protectedProcedure, router } from '../context'

// Note: twitterRouter is kept in the API app due to API-specific dependencies
// Content router can be extended later if needed

export const contentRouter = createContentRouter(router, protectedProcedure)
