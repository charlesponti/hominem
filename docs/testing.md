# Testing

Choose the lowest test level that can observe the behavior and control the
dependency that produces it. Do not choose an end-to-end test merely because
the behavior ultimately appears in a client.

## Core rules

### 1. Mock proximity

Mock at the nearest boundary where the behavior is controlled. If the client
needs a deterministic status, delay, malformed payload, or recovery response,
mock that network dependency in the client test with MSW. Do not add
`TEST_MODE` branches, fake server modes, or API-only mock handlers solely to
make a client E2E test possible.

An API-side fixture is appropriate when the API itself is under test. It is not
more truthful for a client test than returning the same response through MSW;
it is simply a more distant substitution that adds server-side apparatus.

### 2. Real infrastructure for real E2E

An E2E test must test the real wired system. When an E2E flow requires
infrastructure, use the real or containerized local dependency:

- real Postgres for persistence;
- real Redis and workers for asynchronous jobs;
- real client, API, and transport processes for cross-process behavior.

Only external vendors with cost, side effects, or nondeterministic behavior—
such as LLM, payments, or maps providers—may be mocked during E2E. Mock those
vendors at their outbound network boundary, never by adding test branches to
Hominem application logic.

### 3. Client autonomy

Web and mobile clients must be testable in isolation. A React or Expo screen
should support complete interaction tests without a running Hono API,
Postgres database, or Redis worker. Client tests use MSW for HTTP success,
error, loading, latency, and edge-case responses.

## Test-level rule

Use focused tests for deterministic states and use end-to-end tests for real
cross-boundary behavior.

| Test level | Use it for | Do not use it to claim |
| --- | --- | --- |
| Unit | Pure transformations, reducers, parsers, and contracts | UI, transport, or browser behavior |
| Component/hook with MSW | Client reactions to loading, latency, empty data, HTTP errors, retries, and recovery | The real API, deployment, or browser wiring |
| SSR loader/route test with Node MSW | Server-rendered loaders and route mapping of dependency responses | Browser navigation or hydration |
| API integration test | API routes, application services, persistence, authorization, and external-provider adapters | Client rendering or browser behavior |
| Playwright/Maestro | Navigation, authentication wiring, hydration, browser/device APIs, layout, accessibility, real streaming, and critical cross-process journeys | Every deterministic API failure permutation |

For the Apple-only Omiro client, use React Native Testing Library and the
available MSW-compatible client boundary for isolated interaction tests, and
Maestro only for real iOS simulator behavior.

## MSW versus API-side failure fixtures

MSW and an API-side fixture that returns a false response are both dependency
substitutions. The meaningful difference is which boundary owns the behavior
being tested:

- If the question is “does the client render and recover correctly when this
  request is slow or fails?”, use MSW at the client or SSR dependency boundary.
- If the question is “does the API produce the correct response, persistence,
  authorization, or event behavior under this failure?”, use the API testkit
  and its real application boundary.
- Do not build an API failure-injection apparatus solely to drive a client
  failure state when MSW can provide the same response at the client boundary.
  That duplicates control infrastructure without increasing evidence for the
  client behavior.

For browser-side tests, use MSW's browser/jsdom setup. For SSR loaders, use
MSW's Node `setupServer` in the loader or route test. In both cases, exercise
the real component, hook, loader, or route under test; mock only the external
network dependency.

## When end-to-end evidence is required

Use Playwright or Maestro when correctness depends on a real browser or device
boundary, including:

- navigation, redirects, cookies, authentication, and cross-origin wiring;
- SSR output followed by hydration and client takeover;
- browser or device APIs, native input, permissions, and platform behavior;
- layout, responsive constraints, accessible names, focus, and keyboard input;
- real streaming, reconnect, replay, or cancellation across processes;
- a small number of critical journeys proving independently tested pieces are
  wired together.

Use focused MSW tests for deterministic permutations such as HTTP errors,
timeouts, delays, empty responses, retry-after-failure, and recovery states.
An end-to-end smoke check may supplement those tests when presentation matters,
but it must not motivate a new proxy or server-interception system solely to
make a deterministic dependency failure injectable.

## Feature decision tree

Use this sequence before creating a test:

1. If the behavior is pure computation, reducer logic, schema validation, or
   client-only state, write a unit or component test without backend services.
2. If the client is being tested against network responses, loading, retries,
   validation errors, or edge-case payloads, write a client integration test
   with MSW. Do not launch the backend or an E2E runner.
3. If Hono routes, middleware, application services, database queries,
   authorization, Redis queues, or workers are being tested, write an API
   integration test against the real local infrastructure. Mock only external
   HTTP vendors with MSW Node or an equivalent outbound interceptor. Do not
   launch a browser or client app.
4. If the feature is a critical full-stack journey whose correctness depends
   on client, API, persistence, worker, or transport wiring, write a concise
   E2E test against the real local system.

Before approving an E2E test, ask:

- Does it require conditional API responses, forced HTTP errors, artificial
  delays, malformed payloads, rate limits, or rare races? If yes, use MSW for
  client behavior or an API integration test for server behavior.
- Does it require adding mock flags or bypass logic inside the API? If yes,
  stop and move the mock to the client boundary or test the API directly.
- Does it prove a critical multi-step journey through real infrastructure?
  If yes, keep it as a true E2E test and keep the number of such tests small.
- Is it only a critical smoke path such as authentication or core creation?
  If yes, use a concise E2E check rather than duplicating every state variant.

## Coverage expectations by client

Client component/integration tests should cover optimistic updates and
rollback, loading and skeleton states, infinite-scroll boundaries, malformed
or partial payloads, permission failures, retries, and recovery. Prefer local
handler factories when multiple tests need the same response contract; do not
create a shared testing package until repeated cross-package use justifies it.

API integration tests should cover Hono handlers, middleware, persistence,
authorization, queue pushes, worker behavior, and durable side effects against
dedicated local Postgres/Redis state. Keep test data isolated and reset it by
the repository's supported database/testkit mechanism.

Automated tests must never call live third-party production endpoints. If a
vendor contract needs verification, maintain a small separate contract suite
against a vendor staging or explicitly authorized environment. Run it on
schedule or on demand, outside standard pull-request validation.

## Evidence boundaries

Passing a focused test proves the behavior at its named boundary. It does not
prove a broader boundary implicitly. Record the evidence honestly:

- MSW proves client or SSR behavior against a specified response contract.
- API integration proves server behavior against its real application and
  persistence boundaries.
- Playwright/Maestro proves behavior in the real browser/device environment.

The repository-wide completion and artifact requirements remain governed by
[`docs/evidence.md`](evidence.md).
