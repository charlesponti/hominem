import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { trpc as t } from '../trpc'

// Email Mask Router
export class EmailMaskRouter {
  private emailAddresses: {
    id: string
    uuidEmail: string
    userId: string
    isActive: boolean
  }[] = []
  private emailDomain: string

  constructor(emailDomain: string) {
    this.emailDomain = emailDomain
    if (!emailDomain) {
      throw new Error('Email domain must be provided.')
    }
  }

  public router = t.router({
    generateEmail: t.procedure.input(z.object({ userId: z.string() })).mutation(({ input }) => {
      const uuid = randomUUID()
      const newEmail = {
        id: randomUUID(),
        uuidEmail: `${uuid}@${this.emailDomain}`,
        userId: input.userId,
        isActive: true,
      }
      this.emailAddresses.push(newEmail)
      return newEmail
    }),

    deactivateEmail: t.procedure.input(z.object({ id: z.string() })).mutation(({ input }) => {
      const index = this.emailAddresses.findIndex((email) => email.id === input.id)
      if (index === -1) return false
      this.emailAddresses[index].isActive = false
      return true
    }),

    getEmailById: t.procedure.input(z.object({ id: z.string() })).query(({ input }) => {
      return this.emailAddresses.find((email) => email.id === input.id)
    }),

    getEmailsByUserId: t.procedure.input(z.object({ userId: z.string() })).query(({ input }) => {
      return this.emailAddresses.filter((email) => email.userId === input.userId && email.isActive)
    }),
  })
}
