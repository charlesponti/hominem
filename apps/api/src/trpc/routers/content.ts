import { createContentRouter } from '@hominem/notes'
import { protectedProcedure, router } from '../procedures.js'

export const contentRouter = createContentRouter(router, protectedProcedure)
