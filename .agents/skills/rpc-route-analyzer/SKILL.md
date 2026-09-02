---
name: rpc-route-analyzer
description: Analyze Hominem RPC routes for crossed architectural seams, misplaced logic, and inconsistent route patterns; produce an evidence-backed ownership and extraction plan.
---

# RPC Route Analyzer

Use this skill when reviewing, simplifying, or planning a Hominem RPC route in
`services/api/src/rpc`. The goal is to make routes predictable transport
adapters, not to optimize line count by itself.

## Target route shape

RPC routes should normally do only this:

1. Read authenticated request context.
2. Validate route parameters, query, or body with the route schema.
3. Call one application service operation.
4. Adapt the typed result to HTTP, JSON, or SSE.

Repositories perform persistence operations. Application services own business
workflows, transactions, provider calls, retries, cancellation, event
publication, and coordination between repositories. `@hominem/chat` owns chat
domain types, state transitions, semantic event contracts, projections, and
pure interpretation. RPC packages own client transport helpers and transport
types; they do not become a second domain layer.

## Analysis workflow

1. Read the repository and directory `AGENTS.md` files, relevant governing
   documents, package scripts, and current git status. Preserve unrelated user
   changes.
2. Establish the route family and all sibling routes. Inspect the route’s
   schemas, middleware, callers, application services, repositories, provider
   adapters, event streams, DTO mappers, and focused tests.
3. Measure the route, but do not treat size as proof. Record route length,
   handler count, repeated workflow blocks, direct dependency count, and local
   helper count.
4. Trace every handler from request entry to response completion. For each
   meaningful operation, record inputs, state reads/writes, external effects,
   transaction boundaries, errors, and lifecycle decisions.
5. Mark every architectural seam crossed by route code. Use the seam taxonomy
   below and cite exact file/line evidence.
6. Assign each operation a better home. Prefer an existing service or domain
   function; propose a new one only when the workflow has a coherent boundary.
7. Compare sibling entry points such as send, start, regenerate, retry,
   confirmation, cancel, replay, and streaming. Identify duplicated lifecycle
   logic and define the single service operation that should own it.
8. Produce the finding ledger and a staged extraction plan. Do not edit files
   during analysis unless the user explicitly requests implementation.

Useful searches:

```bash
rg -n "\.post\(|\.get\(|\.patch\(|\.delete\(" services/api/src/rpc
rg -n "db\.|Repository|runInTransaction|transaction|JSON\.parse|JSON\.stringify" <route>
rg -n "fetch\(|callTool|provider|AbortController|retry|cancel|publish|appendEvent" <route>
rg -n "to[A-Z][A-Za-z]+Dto|zValidator|streamSSE|ReadableStream|upgradeWebSocket" <route>
```

## Seam taxonomy

Check every route for these crossings. A crossing is not automatically wrong;
the report must explain why the route is the wrong owner or why it is a valid
framework-boundary exception.

- **Transport** — Hono context, status codes, headers, cookies, JSON, SSE,
  request body reading, stream lifecycle.
- **Authentication and authorization** — session extraction, owner checks,
  capability checks, resource access policy.
- **Input contract** — schema validation, coercion, cursor parsing, JSON
  decoding, malformed-input policy.
- **Application workflow** — multi-step business decisions, branching,
  retries, confirmation, cancellation, idempotency, or lifecycle transitions.
- **Transaction and consistency** — transaction creation, commit ordering,
  rollback, durable event ordering, terminal races.
- **Persistence** — direct Kysely calls, row decoding, JSON column mapping,
  repository-specific cleanup, or persistence DTO construction.
- **Domain** — state-machine transitions, semantic event creation,
  projections, replay interpretation, domain invariants, or tool-call
  reconstruction.
- **Integration** — provider SDKs, MCP/tool calls, queues, event buses,
  storage, speech, or other external effects.
- **Streaming and recovery** — live event publication, replay cursors,
  deduplication, reconnect behavior, abort handling, or stream completion.
- **Presentation mapping** — client-specific DTO shape, legacy aliases, view
  formatting, or platform-specific response semantics.
- **Observability** — logging, tracing, metrics, correlation IDs, and safe
  diagnostic boundaries.

## Strong indicators of misplaced route logic

Flag these with evidence, not as automatic violations:

- A route imports both repositories and provider/integration clients.
- A route opens transactions or decides commit/rollback ordering.
- A route contains a loop that performs provider turns, tool execution, or
  confirmation decisions.
- Multiple routes repeat the same generation, cancellation, retry, or terminal
  handling sequence.
- A route parses or interprets durable domain events instead of delegating to
  the domain/application layer.
- A route contains `JSON.parse`/`JSON.stringify` for a domain payload rather
  than calling a typed boundary parser.
- A route builds domain records, tool effects, or event payloads manually.
- A route owns replay cursor semantics or deduplication state.
- A route catches broad errors and decides product-visible failure behavior.
- A route maps directly from database rows to client DTOs.
- `packages/rpc` contains domain state transitions or server workflow logic.

Preserve route-local code when it is genuinely transport-specific: validating
the route input, setting HTTP headers/status, adapting an async iterable to
SSE, or translating a typed service error into the API error envelope.

## Ownership matrix

For each extracted unit, report:

| Current operation | Crossed seam | Current owner | Correct owner | Why | Observable evidence |
| --- | --- | --- | --- | --- | --- |

Use these destination rules:

- Request parsing and HTTP response adaptation stay in the RPC route.
- Resource authorization belongs in the application service or repository
  boundary, according to the repository’s established convention.
- A single resource mutation belongs in a repository; a workflow spanning
  resources belongs in an application service.
- Domain decisions and semantic event transitions belong in `@hominem/chat`.
- Provider/MCP/storage calls belong behind application/integration services.
- Durable event append, replay, and terminal ordering belong behind the
  generation application service and repositories.
- DTO mapping belongs in a mapper close to the API boundary, unless the shape
  is the domain contract itself.
- SSE framing belongs in a small transport adapter and must not own domain
  state.

## Required report

Start with a direct verdict: `thin`, `mixed`, or `workflow embedded in route`.
Then provide:

1. **Route contract** — method/path, validated input, auth requirement,
   response/stream contract, and sibling routes.
2. **Seam ledger** — every non-trivial seam crossing with exact evidence.
3. **Ownership matrix** — current operation, crossed boundary, proposed home,
   rationale, and completion evidence.
4. **Duplication map** — repeated logic across handlers/routes/packages and the
   one service/domain operation that should replace it.
5. **Target route shape** — a short pseudocode outline showing the intended
   thin adapter.
6. **Ordered extraction plan** — dependency-safe steps, preserving behavior
   until parity evidence exists.
7. **Tests and acceptance evidence** — route contract tests, service tests,
   repository tests, replay/stream tests, and browser/mobile evidence when
   the route affects those clients.
8. **Open decisions** — only decisions that materially change ownership or
   behavior; label them `OPEN — USER DECISION REQUIRED`.

For each high-confidence finding use:

```text
File(s):
Pattern:
Evidence:
Behavior preserved:
Proposed action:
Correct owner:
Observable completion evidence:
Confidence: high | medium | low
```

Do not recommend moving logic merely because a route is long. Do not invent a
new service for each helper. Group extraction around coherent workflows and
state ownership, and preserve authorization, error semantics, idempotency,
ordering, and streaming behavior.

## Validation

Analysis-only validation should include:

- `git diff --check` when the analysis changes a report or plan;
- repository-wide searches confirming all route siblings were inspected;
- focused test/source inspection for each proposed extraction seam;
- explicit accounting for behavior not proven by static inspection.

If implementation is requested, run the narrowest route/service tests first,
then package typecheck, lint, formatting, and the Hominem evidence checklist.
