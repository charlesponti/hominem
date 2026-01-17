# Hominem API
<<<<<<< HEAD

This repo uses the following technologies:

- [**Fastify**](https://www.fastify.io/): fast, low overhead web framework
  - cors: [**@fastify/cors**](https://www.npmjs.com/package/@fastify/cors): 
  - security header: [**@fastify/helmet**](https://www.npmjs.com/package/@fastify/helmet)
  - circuit breaker: [**@fastify/circuit-breaker**](https://www.npmjs.com/package/@fastify/circuit-breaker)
    - [_circuit breaker_](https://martinfowler.com/bliki/CircuitBreaker.html)
  - rate limiting: [**@fastify/rate-limit**](https://www.npmjs.com/package/@fastify/rate-limit)
- **Authentication**
  - [**Clerk**](https://clerk.com): User authentication and management
- **Data**
  - object-relational database: [*PostgreSQL*](https://www.postgresql.org/): 
  - object-relational mapping: [*Drizzle*](https://orm.drizzle.team)
- **Analytics & Observability**
  - application analytics: [*Segment*](https://segment.com/)
  - application monitoring: [*Sentry*](https://sentry.io/)
- **Other**
  - [*Resend*](https://resend.com/): Email delivery service


## Application Features
- **chat**
  - **single-response**: users can request a single response to a question or statement. (no history)
- **health**: track health data including activities, duration, and calories burned
- **notes**: take notes with NLP analysis for insights
- **surveys**: create surveys and collect responses
- **job applications**: track job applications and their status
- **companies**: manage company information

## Authentication
The API uses Supabase Auth for authentication. You'll need to set up the following environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

All authenticated routes will use Supabase's JWT verification to validate requests. Clients should include the Authorization header with a Bearer token from Supabase.

## API Endpoints

### Health

- `GET /api/health` - Get health data with optional filters
- `GET /api/health/:id` - Get health data by ID
- `POST /api/health` - Add new health data
- `PUT /api/health/:id` - Update health data
- `DELETE /api/health/:id` - Delete health data

### Notes

- `GET /api/notes` - Get all notes for authenticated user
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note
- `POST /api/notes/:id/analyze` - Analyze a note with NLP

### Surveys

- `GET /api/surveys` - Get all surveys for authenticated user
- `POST /api/surveys` - Create a new survey
- `POST /api/surveys/vote` - Vote on a survey

### Applications

- `GET /api/applications` - Get all applications for authenticated user
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Create a new application
- `PUT /api/applications/:id` - Update an application
- `DELETE /api/applications/:id` - Delete an application
- `PUT /api/applications/bulk` - Bulk create/update applications

### Companies

- `GET /api/companies/search` - Search companies by name
- `POST /api/companies` - Create a company
=======
>>>>>>> main
