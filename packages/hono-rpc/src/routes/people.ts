import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  CreatePersonInputSchema,
  UpdatePersonInputSchema,
  AddPersonRelationInputSchema,
} from '../schemas/persons.schema'
import {
  listPersons,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  listPersonRelations,
  addPersonRelation,
} from '@hominem/db/services/persons.service'
import { NotFoundError, ForbiddenError } from '../errors'

export const peopleRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List persons
  .get('/', async (c) => {
    try {
      const userId = c.get('userId')!
      const persons = await listPersons(userId as any)
      return c.json({ success: true, data: persons })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Get single person
  .get('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      const person = await getPerson(id, userId as any)
      if (!person) {
        throw new NotFoundError('Person not found')
      }
      return c.json({ success: true, data: person })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Create person
  .post('/', zValidator('json', CreatePersonInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const data = c.req.valid('json')

      const payload: {
        personType: 'individual' | 'organization' | 'household'
        firstName?: string | null
        lastName?: string | null
        email?: string | null
        phone?: string | null
        notes?: string | null
      } = {
        personType: data.personType,
      }
      if (data.firstName !== undefined) payload.firstName = data.firstName
      if (data.lastName !== undefined) payload.lastName = data.lastName
      if (data.email !== undefined) payload.email = data.email
      if (data.phone !== undefined) payload.phone = data.phone
      if (data.notes !== undefined) payload.notes = data.notes

      const newPerson = await createPerson(userId as any, payload)

      return c.json({ success: true, data: newPerson }, 201)
    } catch (error) {
      throw error
    }
  })
  // Update person
  .patch('/:id', zValidator('json', UpdatePersonInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      const updateData: {
        personType?: 'individual' | 'organization' | 'household'
        firstName?: string | null
        lastName?: string | null
        email?: string | null
        phone?: string | null
        notes?: string | null
      } = {}
      if (data.personType !== undefined) updateData.personType = data.personType
      if (data.firstName !== undefined) updateData.firstName = data.firstName
      if (data.lastName !== undefined) updateData.lastName = data.lastName
      if (data.email !== undefined) updateData.email = data.email
      if (data.phone !== undefined) updateData.phone = data.phone
      if (data.notes !== undefined) updateData.notes = data.notes

      const updatedPerson = await updatePerson(id, userId as any, updateData)
      if (!updatedPerson) {
        throw new NotFoundError('Person not found or access denied')
      }
      return c.json({ success: true, data: updatedPerson })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Delete person
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      const deleted = await deletePerson(id, userId as any)
      if (!deleted) {
        throw new NotFoundError('Person not found or access denied')
      }
      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // List person relations
  .get('/:id/relations', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      const relations = await listPersonRelations(id, userId as any)
      return c.json({ success: true, data: relations })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  // Add person relation
  .post('/:id/relations', zValidator('json', AddPersonRelationInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      const relation = await addPersonRelation(id, data.relatedPersonId, data.relationType, userId as any)
      return c.json({ success: true, data: relation }, 201)
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
