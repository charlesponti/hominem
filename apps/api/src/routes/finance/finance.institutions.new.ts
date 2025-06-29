import {
    createInstitution,
    getAllInstitutions,
    getInstitution,
    getInstitutionAccounts,
    getUserAccounts,
    getUserInstitutionConnections
} from '@hominem/utils/finance'
import { z } from 'zod'
import { protectedProcedure, router } from '../../trpc/index.js'

export const institutionsNewRouter = router({
  // Get all institution connections for the user
  connections: protectedProcedure.query(async ({ ctx }) => {
    return await getUserInstitutionConnections(ctx.userId)
  }),

  // Get all accounts with institution information
  accounts: protectedProcedure.query(async ({ ctx }) => {
    return await getUserAccounts(ctx.userId)
  }),

  // Get accounts for a specific institution
  institutionAccounts: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ input, ctx }) => {
      return await getInstitutionAccounts(ctx.userId, input.institutionId)
    }),

  // Get institution details
  get: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ input }) => {
      return await getInstitution(input.institutionId)
    }),

  // Get all available institutions
  list: protectedProcedure.query(async () => {
    return await getAllInstitutions()
  }),

  // Create a new institution (for manual accounts)
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Name is required'),
        url: z.string().url().optional(),
        logo: z.string().optional(),
        primaryColor: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createInstitution(input)
    }),
}) 
