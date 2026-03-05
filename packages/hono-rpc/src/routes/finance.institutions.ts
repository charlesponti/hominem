import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import { createInstitution, getAllInstitutions } from '@hominem/finance-services'
import { authMiddleware } from '../middleware/auth'

import type { AppContext } from '../middleware/auth'
import type {
  InstitutionCreateOutput,
  InstitutionsListOutput,
} from '../types/finance/institutions.types'

const emptyBodySchema = z.object({})

const createInstitutionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  logo: z.string().optional(),
  url: z.string().optional(),
  primaryColor: z.string().optional(),
  country: z.string().optional(),
})

export const institutionsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const institutions = await getAllInstitutions()
    return c.json<InstitutionsListOutput>(
      institutions.map((item) => ({
        id: item.id,
        name: item.name,
      })),
      200,
    )
  })
  .post('/create', authMiddleware, zValidator('json', createInstitutionSchema), async (c) => {
    const input = c.req.valid('json')
    const created = await createInstitution(input.name)
    return c.json<InstitutionCreateOutput>(
      {
        id: created.id,
        name: created.name,
      },
      201,
    )
  })
