import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

// This file is deprecated and will be removed in a future version
// All functionality has been moved to job-applications.ts
export async function applicationRoutes(fastify: FastifyInstance) {
  const redirectToJobApplications = async (request: FastifyRequest, reply: FastifyReply) => {
    const urlPath = request.url.split('/')

    if (urlPath.length === 2) {
      return reply.redirect('/api/job-applications', 307)
    }

    console.log('Redirecting to job-applications', `/api/job-applications${urlPath.pop()}`)
    return reply.redirect(`/api/job-applications${urlPath.pop()}`, 307)
  }

  fastify.get('/', redirectToJobApplications)
  fastify.get('/:id', redirectToJobApplications)
  fastify.post('/', redirectToJobApplications)
  fastify.put('/:id', redirectToJobApplications)
  fastify.delete('/:id', redirectToJobApplications)
  fastify.put('/bulk', redirectToJobApplications)
}
