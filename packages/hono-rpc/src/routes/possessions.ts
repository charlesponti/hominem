import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import {
  createContainer,
  createPossession,
  deleteContainer,
  deletePossession,
  getContainer,
  getPossession,
  listContainers,
  listPossessions,
  updateContainer,
  updatePossession,
} from '@hominem/db/services/possessions.service'
import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreateContainerInputSchema,
  CreatePossessionInputSchema,
  ListPossessionsFilterSchema,
  UpdateContainerInputSchema,
  UpdatePossessionInputSchema,
} from '../schemas/possessions.schema'
import { ForbiddenError, NotFoundError } from '../errors'

export const possessionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', ListPossessionsFilterSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof listPossessions>[0]
    const query = c.req.valid('query')

    const possessions = await listPossessions(userId, query.category)
    return c.json({ success: true, data: possessions })
  })
  .get('/:id', async (c) => {
    const userId = c.get('userId') as Parameters<typeof getPossession>[1]
    const id = c.req.param('id') as Parameters<typeof getPossession>[0]

    const possession = await getPossession(id, userId)
    if (!possession) {
      throw new NotFoundError('Possession not found')
    }

    return c.json({ success: true, data: possession })
  })
  .post('/', zValidator('json', CreatePossessionInputSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof createPossession>[0]
    const data = c.req.valid('json')

    const newPossession = await createPossession(userId, {
      name: data.name,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.condition !== undefined ? { condition: data.condition } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.containerId !== undefined ? { containerId: data.containerId } : {}),
    })

    return c.json({ success: true, data: newPossession }, 201)
  })
  .patch('/:id', zValidator('json', UpdatePossessionInputSchema), async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof updatePossession>[1]
      const id = c.req.param('id') as Parameters<typeof updatePossession>[0]
      const data = c.req.valid('json')

      const updateData: Parameters<typeof updatePossession>[2] = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.category !== undefined) updateData.category = data.category
      if (data.condition !== undefined) updateData.condition = data.condition
      if (data.location !== undefined) updateData.location = data.location
      if (data.containerId !== undefined) updateData.containerId = data.containerId

      const updatedPossession = await updatePossession(id, userId, updateData)
      if (!updatedPossession) {
        throw new NotFoundError('Possession not found or access denied')
      }

      return c.json({ success: true, data: updatedPossession })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof deletePossession>[1]
      const id = c.req.param('id') as Parameters<typeof deletePossession>[0]

      const deleted = await deletePossession(id, userId)
      if (!deleted) {
        throw new NotFoundError('Possession not found or access denied')
      }

      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .get('/containers', async (c) => {
    const userId = c.get('userId') as Parameters<typeof listContainers>[0]
    const containers = await listContainers(userId)
    return c.json({ success: true, data: containers })
  })
  .get('/containers/:id', async (c) => {
    const userId = c.get('userId') as Parameters<typeof getContainer>[1]
    const id = c.req.param('id') as Parameters<typeof getContainer>[0]

    const container = await getContainer(id, userId)
    if (!container) {
      throw new NotFoundError('Container not found')
    }

    return c.json({ success: true, data: container })
  })
  .post('/containers', zValidator('json', CreateContainerInputSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof createContainer>[0]
    const data = c.req.valid('json')

    const newContainer = await createContainer(userId, {
      name: data.name,
      ...(data.description !== undefined ? { description: data.description } : {}),
    })

    return c.json({ success: true, data: newContainer }, 201)
  })
  .patch('/containers/:id', zValidator('json', UpdateContainerInputSchema), async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof updateContainer>[1]
      const id = c.req.param('id') as Parameters<typeof updateContainer>[0]
      const data = c.req.valid('json')

      const updateData: Parameters<typeof updateContainer>[2] = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description

      const updatedContainer = await updateContainer(id, userId, updateData)
      if (!updatedContainer) {
        throw new NotFoundError('Container not found or access denied')
      }

      return c.json({ success: true, data: updatedContainer })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .delete('/containers/:id', async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof deleteContainer>[1]
      const id = c.req.param('id') as Parameters<typeof deleteContainer>[0]

      const deleted = await deleteContainer(id, userId)
      if (!deleted) {
        throw new NotFoundError('Container not found or access denied')
      }

      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
