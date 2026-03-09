import { zValidator } from '@hono/zod-validator'
import { db } from '@hominem/db'
import { Hono } from 'hono'
import * as z from 'zod'

import { authMiddleware, type AppContext } from '../middleware/auth'

import type { CategoriesListOutput } from '../types/finance/categories.types'

const emptyBodySchema = z.object({})

export const tagsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const userId = c.get('userId')!
    const tags = await db
      .selectFrom('tags')
      .select(['id', 'owner_id', 'name', 'color'])
      .where('owner_id', '=', userId)
      .orderBy('name', 'asc')
      .orderBy('id', 'asc')
      .execute()

    return c.json<CategoriesListOutput>(
      tags.map((tag) => ({
        id: tag.id,
        userId: tag.owner_id,
        name: tag.name,
        color: tag.color ?? null,
      })),
      200,
    )
  })
