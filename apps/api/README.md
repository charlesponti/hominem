# Hominem API

This repo uses the following technologies:

- [**Fastify**](https://www.fastify.io/): fast, low overhead web framework
  - cors: [**@fastify/cors**](https://www.npmjs.com/package/@fastify/cors): 
  - security header: [**@fastify/helmet**](https://www.npmjs.com/package/@fastify/helmet)
  - circuit breaker: [**@fastify/circuit-breaker**](https://www.npmjs.com/package/@fastify/circuit-breaker)
    - [_circuit breaker_](https://martinfowler.com/bliki/CircuitBreaker.html)
  - rate limiting: [**@fastify/rate-limit**](https://www.npmjs.com/package/@fastify/rate-limit)
- **Authentication**
  - [**Supabase**](https://supabase.io): User authentication and management
- **Data**
  - object-relational database: [*PostgreSQL*](https://www.postgresql.org/): 
  - object-relational mapping: [*Drizzle*](https://orm.drizzle.team)
- **Analytics & Observability**
  - application analytics: [*Segment*](https://segment.com/)
  - application monitoring: [*Sentry*](https://sentry.io/)
- **Other**
  - [*Sendgrid*](https://sendgrid.com/): Email delivery service


## Authentication
The API uses Supabase for authentication. You'll need to set up the following environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

All authenticated routes will use Supabase's JWT verification to validate requests.

## Database

The API uses a PostgreSQL database. You'll need to set up the following environment variable:
- `DATABASE_URL`: connection string for your PostgreSQL database.

## Budget Categories

Budget categories have a unique constraint on `name + userId`, ensuring that:
- Each user can only have one budget category with a given name
- Different users can have budget categories with the same name
- The bulk create endpoint (`/api/finance/budget/bulk-create-from-transactions`) automatically skips existing categories and only creates new ones
- Single category creation returns a 409 error if a category with the same name already exists for that user

This prevents duplicate categories when syncing from transaction data while allowing users to have predictable, unique category names.
