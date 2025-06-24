import { NotesService } from '@hominem/utils/services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { ForbiddenError } from '../lib/errors.js'
export const notesRoutes = new Hono()

const notesService = new NotesService()

// Note creation schema (personal notes only)
const createNoteSchema = z.object({
  type: z.enum(['note', 'task', 'timer', 'journal', 'document']).default('note'),
  title: z.string().optional(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .default([]),
  taskMetadata: z
    .object({
      status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
      dueDate: z.string().nullable().optional(),
      startTime: z.string().optional(),
      firstStartTime: z.string().optional(),
      endTime: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
})

// Note update schema
const updateNoteSchema = z.object({
  type: z.enum(['note', 'task', 'timer', 'journal', 'document']).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).optional(),
  mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  taskMetadata: z
    .object({
      status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
      dueDate: z.string().nullable().optional(),
      startTime: z.string().optional(),
      firstStartTime: z.string().optional(),
      endTime: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
})

// Note list query schema
const listNotesSchema = z.object({
  types: z
    .string()
    .optional()
    .transform(
      (val) => val?.split(',') as ('note' | 'task' | 'timer' | 'journal' | 'document')[] | undefined
    ),
  query: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => val?.split(',') as string[] | undefined),
  since: z.string().optional(),
})

// Note ID param schema
const noteIdSchema = z.object({
  id: z.string().uuid('Invalid note ID format'),
})

// Get all notes for user
notesRoutes.get('/', zValidator('query', listNotesSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const filters = c.req.valid('query')
    const notes = await notesService.list(userId, filters)
    return c.json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return c.json(
      {
        error: 'Failed to fetch notes',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Create new note
notesRoutes.post('/', zValidator('json', createNoteSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const noteData = c.req.valid('json')
    const newNote = await notesService.create({
      ...noteData,
      userId,
    })
    return c.json({ note: newNote }, 201)
  } catch (error) {
    console.error('Error creating note:', error)
    return c.json(
      {
        error: 'Failed to create note',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get note by ID
notesRoutes.get('/:id', zValidator('param', noteIdSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { id } = c.req.valid('param')
    const note = await notesService.getById(id, userId)
    return c.json({ note })
  } catch (error) {
    if (error instanceof Error && error.message === 'Content not found') {
      return c.json({ error: 'Note not found' }, 404)
    }
    console.error('Error fetching note:', error)
    return c.json(
      {
        error: 'Failed to fetch note',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Update note
notesRoutes.put(
  '/:id',
  zValidator('param', noteIdSchema),
  zValidator('json', updateNoteSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      throw ForbiddenError('Unauthorized')
    }

    try {
      const { id } = c.req.valid('param')
      const updateData = c.req.valid('json')
      const updatedNote = await notesService.update({
        id,
        userId,
        ...updateData,
      })
      return c.json({ note: updatedNote })
    } catch (error) {
      if (error instanceof Error && error.message === 'Content not found') {
        return c.json({ error: 'Note not found' }, 404)
      }
      console.error('Error updating note:', error)
      return c.json(
        {
          error: 'Failed to update note',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete note
notesRoutes.delete('/:id', zValidator('param', noteIdSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { id } = c.req.valid('param')
    await notesService.delete(id, userId)
    return c.body(null, 204)
  } catch (error) {
    if (error instanceof Error && error.message === 'Content not found') {
      return c.json({ error: 'Note not found' }, 404)
    }
    console.error('Error deleting note:', error)
    return c.json(
      {
        error: 'Failed to delete note',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Sync notes (for offline sync)
notesRoutes.post('/sync', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const body = await c.req.json()
    const itemsToSync = body.items || []
    const result = await notesService.sync(itemsToSync, userId)
    return c.json(result)
  } catch (error) {
    console.error('Error syncing notes:', error)
    return c.json(
      {
        error: 'Failed to sync notes',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
