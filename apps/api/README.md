# Rocco API

This repo uses the following technologies:

- [**Fastify**](https://www.fastify.io/): fast, low overhead web framework
  - cors: [**@fastify/cors**](https://www.npmjs.com/package/@fastify/cors): 
  - session management: [**@fastify/secure-session**](https://www.npmjs.com/package/@fastify/secure-session)
  - csrf: [**@fastify/csrf-protection**](https://www.npmjs.com/package/@fastify/csrf-protection)
  - security header: [**@fastify/helmet**](https://www.npmjs.com/package/@fastify/helmet)
  - circuit breaker: [**@fastify/circuit-breaker**](https://www.npmjs.com/package/@fastify/circuit-breaker)
    - [_circuit breaker_](https://martinfowler.com/bliki/CircuitBreaker.html)
  - rate limiting: [**@fastify/rate-limit**](https://www.npmjs.com/package/@fastify/rate-limit)
- **Data**
  - object-relational database: [*PostgreSQL*](https://www.postgresql.org/): 
  - object-relational mapping: [*Drizzle*](https://orm.drizzle.team)
- **Analytics & Observability**
  - application analytics: [*Segment*](https://segment.com/)
  - application monitoring: [*Sentry*](https://sentry.io/)
- **Other**
  - [*Sendgrid*](https://sendgrid.com/): Email delivery service


## application features
- **chat**
  - **single-response**: users can request a single response to a question or statement. (no history)