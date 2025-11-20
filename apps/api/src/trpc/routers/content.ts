import { createContentRouter } from '@hominem/notes'
import { protectedProcedure, router } from '../procedures'

export const contentRouter = createContentRouter(router, protectedProcedure)
