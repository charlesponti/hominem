import { db } from '@ponti/utils/db'
import { surveyOptions, surveyVotes, surveys } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../trpc'

export const surveysRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        options: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [survey] = await db
        .insert(surveys)
        .values({
          name: input.name,
          description: input.description,
          userId: ctx.userId,
        })
        .returning()

      await db.insert(surveyOptions).values(
        input.options.map((option) => ({
          ...option,
          surveyId: survey.id,
        }))
      )

      return survey
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.surveys.findMany({
      where: eq(surveys.userId, ctx.userId),
      with: {
        options: true,
        votes: true,
      },
    })
  }),

  vote: protectedProcedure
    .input(
      z.object({
        surveyId: z.string(),
        optionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.insert(surveyVotes).values({
        surveyId: input.surveyId,
        optionId: input.optionId,
        userId: ctx.userId,
      })
    }),
})
