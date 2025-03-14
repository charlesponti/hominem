import { protectedProcedure, router } from '@/server/trpc'
import { db } from '@ponti/utils/db'
import { NLPProcessor } from '@ponti/utils/nlp'
import { notes } from '@ponti/utils/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export const notesRouter = router({
  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const nlpProcessor = new NLPProcessor()
      const analysis = await nlpProcessor.analyzeText(input.content)

      const note = await db.insert(notes).values({
        analysis,
        content: input.content,
        userId: ctx.userId,
      })
      return note
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.select().from(notes).where(eq(notes.userId, ctx.userId))
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
        title: z.string(),
        tags: z.array(z.record(z.string(), z.string())).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nlpProcessor = new NLPProcessor()
      const analysis = await nlpProcessor.analyzeText(input.content)

      const updated = await db
        .update(notes)
        .set({
          analysis,
          content: input.content,
          title: input.title,
          tags: input.tags,
        })
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)))

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(notes).where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)))
      return { success: true }
    }),

  analyze: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the note
      const noteResult = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)))
        .limit(1)

      if (!noteResult.length) {
        throw new Error('Note not found')
      }

      const note = noteResult[0]

      // Analyze the content
      const nlpProcessor = new NLPProcessor()
      const analysis = await nlpProcessor.analyzeText(note.content)

      // Update the note with the analysis
      await db
        .update(notes)
        .set({ analysis })
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)))

      return { analysis }
    }),
})
