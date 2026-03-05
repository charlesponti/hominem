import { getTransactionTags } from '@hominem/finance-services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

import { authMiddleware, type AppContext } from '../middleware/auth'

import type { CategoriesListOutput } from '../types/finance/categories.types'

const emptyBodySchema = z.object({})

export const tagsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!
    const tags = await getTransactionTags(userId)
    return c.json<CategoriesListOutput>(tags, 200)
  })
