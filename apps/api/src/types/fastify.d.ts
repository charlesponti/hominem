import type { MultipartFile } from '@fastify/multipart'
import type { User } from '@ponti/utils/schema'
import type { MailService } from '@sendgrid/mail'
import type { PerformanceService } from '../services/performance.service'

declare module '@fastify/secure-session' {
  interface SessionData {
    data: {
      name: string | null
      userId: string
      isAdmin: boolean
      roles: string[]
    }
  }
}

declare module 'fastify' {
  import type { Redis } from 'ioredis'

  interface FastifyInstance extends FastifyServerFactory {
    redis: Redis
    performanceService: PerformanceService
    getUserId: (FastifyRequest) => string
    sendgrid: MailService
    sendEmail: (email: string, subject: string, text: string, html: string) => Promise<void>
    sendEmailToken: (email: string, emailToken: string) => void
    jwt: {
      sign: (payload: SessionToken) => Promise<Token>
      verify: (token: string) => Promise<SessionToken>
    }
  }

  interface FastifyRequest {
    file: MultipartFile
    user?: User
    userId?: string | null
    clerkId?: string | null
  }
}
