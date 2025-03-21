import { z } from 'zod'
import { trpc } from '../trpc'

export class NotesRouter {
  private notes: {
    id: string
    content: string
    title: string
    createdAt: Date
    updatedAt?: Date
  }[] = []

  public router = trpc.router({
    create: trpc.procedure
      .input(z.object({ details: z.object({ content: z.string() }) }))
      .mutation(async ({ input }) => {
        const note = {
          id: crypto.randomUUID(),
          content: input.details.content,
          title: input.details.content.split('\n')[0] || 'Untitled',
          createdAt: new Date(),
        }
        this.notes.push(note)
        return note
      }),

    list: trpc.procedure.query(async () => {
      return this.notes
    }),

    update: trpc.procedure
      .input(z.object({ id: z.string(), details: z.object({ content: z.string() }) }))
      .mutation(async ({ input }) => {
        const index = this.notes.findIndex((n) => n.id === input.id)
        if (index === -1) throw new Error('Note not found')

        this.notes[index] = {
          ...this.notes[index],
          content: input.details.content,
          title: input.details.content.split('\n')[0] || 'Untitled',
          updatedAt: new Date(),
        }
        return this.notes[index]
      }),

    delete: trpc.procedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
      const index = this.notes.findIndex((n) => n.id === input.id)
      if (index === -1) throw new Error('Note not found')
      this.notes.splice(index, 1)
      return { success: true }
    }),
  })
}
