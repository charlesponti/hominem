import type { CookieSerializeOptions } from '@fastify/cookie'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import assert from 'node:assert'

const { COOKIE_DOMAIN, COOKIE_NAME, COOKIE_SECRET, COOKIE_SALT } = process.env

assert(COOKIE_DOMAIN, 'The COOKIE_DOMAIN is missing.')
assert(COOKIE_NAME, 'The COOKIE_NAME is missing.')
assert(COOKIE_SECRET, 'The COOKIE_SECRET is missing.')
assert(COOKIE_SALT, 'The COOKIE_SALT is missing.')

const sessionPlugin: FastifyPluginAsync = async (server) => {
  server.register(require('@fastify/secure-session'), {
    cookieName: COOKIE_NAME, // Defaults to `session`
    secret: COOKIE_SECRET,
    salt: COOKIE_SALT,
    cookie: {
      maxAge: 60 * 60 * 24 * 7,
      domain: COOKIE_DOMAIN,
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    } as CookieSerializeOptions,
  })
}

export default fp(sessionPlugin)
