import { env } from '@/lib/env'
import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { list, listInvite, users } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

export default function sendListInvite(server: FastifyInstance) {
  server.post('/lists/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }

    // Validate params and body using Zod
    const paramsResult = z
      .object({
        id: z.string().uuid(),
      })
      .safeParse(request.params)

    if (!paramsResult.success) {
      reply.status(400).send({
        error: 'Invalid parameters',
        details: paramsResult.error.format(),
      })
      return
    }

    const bodyResult = z
      .object({
        email: z.string().email(),
      })
      .safeParse(request.body)

    if (!bodyResult.success) {
      reply.status(400).send({
        error: 'Invalid request body',
        details: bodyResult.error.format(),
      })
      return
    }

    const { id } = paramsResult.data
    const { email } = bodyResult.data

    const listRecord = await db.select().from(list).where(eq(list.id, id)).then(takeUniqueOrThrow)

    if (!listRecord) {
      return reply.status(404).send({
        message: 'List not found',
      })
    }

    // Check if user being invited is the list owner
    if (listRecord.userId === request.userId && email === request.user?.email) {
      return reply.status(400).send({
        message: 'You cannot invite yourself to your own list.',
      })
    }

    // Check if an invite already exists for this email on this list
    const existingInvite = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, id), eq(listInvite.invitedUserEmail, email)),
    })

    if (existingInvite) {
      // If invite exists and is not accepted, resend? Or return conflict?
      // If accepted, perhaps indicate they are already a member or invite is completed.
      // For now, treating as a conflict if any invite exists.
      return reply.status(409).send({
        message: 'An invite for this email address to this list already exists.',
      })
    }

    // Attempt to find the user by email to link invitedUserId
    const invitedUserRecord = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    let createdInvite: typeof listInvite.$inferSelect
    try {
      createdInvite = await db
        .insert(listInvite)
        .values({
          listId: id,
          invitedUserEmail: email,
          invitedUserId: invitedUserRecord?.id || null, // Link if user exists
          accepted: false,
          userId, // ID of the user sending the invite
        })
        .returning()
        .then(takeUniqueOrThrow)
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Catch unique constraint violation (e.g., if somehow existingInvite check missed due to race condition or other constraints)
        if (error.message.includes('duplicate key value violates unique constraint')) {
          return reply.status(409).send({
            message: 'Invite already exists or conflicts with an existing record.',
          })
        }
      }

      server.log.error(
        `Error creating list invite: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      return reply.status(500).send({
        message: 'Something went wrong while creating the invite.',
      })
    }

    // Send email to the invited user
    await server.sendEmail(
      email,
      "You've been invited to a list!",
      "You've been invited to a list!",
      `
        <div class="email" style="font-family: sans-serif;">
          <h1 style="color: #333;">You've been invited to a list!</h1>
          <p style="color: #555;">
            You've been invited to join the list "${listRecord.name}".
          </p>
          <p style="color: #555;">
            Click <a href="${env.APP_URL}/invites/incoming" style="color: #007BFF;">here</a> to accept the invite.
          </p>
        </div>
      `
    )

    if (!createdInvite) {
      // This case should ideally not be reached if insert + returning + takeUniqueOrThrow is used
      server.log.error('List invite creation failed to return a record.')
      return reply.status(500).send({
        message: 'Failed to create invite record.',
      })
    }

    return reply.status(201).send({ invite: createdInvite })
  })
}
