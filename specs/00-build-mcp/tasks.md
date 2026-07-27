---

description: "Task list for Build MCP feature implementation"
---

# Tasks: Build MCP

**Input**: Design documents from `specs/00-build-mcp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Feature implementation phases first (Phases 1–5), then all validation, tests, evaluation, and polish in a single final phase (Phase 6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Resolve pnpm workspace `ERR_PNPM_MISSING_TIME` issue
- [x] T002 [P] Install `@modelcontextprotocol/sdk@^1.29.0` in `services/api`
- [x] T003 [P] Add `@hominem/db` migration directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create Goose migration to add `mcp_tool_call` to `app.ai_usage_events` feature CHECK constraint
- [x] T005 Run `just db migrate` and `just db codegen` to apply migration and regenerate Kysely types
- [x] T006 [P] Create MCP transport handler — `server.ts` with Streamable HTTP transport
- [x] T007 [P] Create MCP auth middleware — `routes.ts` with Better Auth MCP plugin session validation
- [x] T008 [P] Create tool registry — `tools.ts` with `registerTool`, `listTools`, `callTool`
- [x] T009 [P] Create MCP schema definitions — `services/api/src/schemas/career.schema.ts`
- [x] T010 [P] Set up MCP test infrastructure — `server.test.ts`, `tools.test.ts`; move the Ollama evaluation to `services/api/scripts/mcp-ollama-eval.ts`
- [x] T010a [P] Implement rate-limiting middleware (`services/api/src/mcp/rate-limiter.ts`) — 5 req/s per user, 429 on excess
- [x] T010b [P] Implement `MCP_ENABLED_SCOPES` conditional import gating in `routes.ts`

**Checkpoint**: Foundation ready.

---

## Phase 3: User Story 1 — Base MCP Server (Priority: P1) 🎯 MVP

**Goal**: Streamable HTTP MCP server with tool discovery, invocation, and Career domain tools.

- [x] T015 [US1] Implement Streamable HTTP transport handler in `services/api/src/mcp/server.ts`
- [x] T016 [P] [US1] Implement tool registration — `registerTool()`, `listTools()`, `callTool()` in `tools.ts`
- [x] T017 [P] [US1] Implement runtime schema definitions in `services/api/src/schemas/career.schema.ts`
- [x] T018 [US1] Implement Career tools — `get_career_portfolio` and `list_career_experiences` in `tools/career.ts`
- [x] T019 [US1] Wire MCP route — `mcpRoutes` in `routes.ts`, mounted in `rpc/app.ts`
- [x] T020 [US1] Register Career tools via `import './tools/career'`
- [x] T021 [US1] Add logging for MCP tool invocation — `logger.warn` on tool failures

---

## Phase 4: User Story 2 — Privacy & Security (Priority: P1)

**Goal**: Scope enforcement, bounded results, no raw provider data exposed.

- [x] T027 [US2] Implement scope enforcement — `hasRequiredScopes` check in `server.ts`
- [x] T028 [P] [US2] Implement evidence utilities — `services/api/src/mcp/evidence.ts`
- [x] T029 [P] [US2] Implement result capping — Career tools enforce `resultCap`; `callTool()` handles null
- [x] T030 [US2] Implement no-data response — tools return null instead of throwing
- [x] T031 [US2] Integrate scope checks — `hasRequiredScopes` enforces `career:read`
- [x] T032 [US2] Add redaction logging — `logRedaction()` in `evidence.ts`

---

## Phase 5: User Story 3 — MCP OAuth Integration (Priority: P2)

**Goal**: MCP clients (ChatGPT, Claude Code, Cursor) authenticate via generic OAuth 2.0.

- [x] T036 [US3] Add Better Auth MCP plugin to auth config in `better-auth.ts`
- [x] T037 [US3] Create OAuth tables — `oauthApplication`, `oauthAccessToken`, `oauthConsent`
- [x] T038 [US3] Implement `getMcpSession()` token validation in `routes.ts`
- [x] T039 [US3] Mount OAuth discovery endpoints — `.well-known/oauth-authorization-server` and `.well-known/oauth-protected-resource`
- [x] T040 [US3] Add WWW-Authenticate header on 401 responses

---

## Phase 6: Validation, Tests, Evaluation & Polish

**Purpose**: All testing, evaluation harness, documentation, and quality checks. Not required for MVP feature completion — can be done incrementally.

### Transport & Validation Tests

- [x] T011 [P] [US1] Transport discovery test — `tools/list` returns registered tool names
- [x] T012 [P] [US1] Transport invocation test — LLM eval exercises `tools/call` end-to-end
- [x] T013 [P] [US1] Transport auth test — unauthenticated request returns 401
- [x] T014 [P] [US1] Transport invalid-input test — request with invalid input schema returns validation error
- [x] T022 [US1] Add validation error handling for malformed JSON-RPC requests

### Privacy & Security Tests

- [ ] T023 [P] [US2] Scope denial test — tool invoked without required scope is denied
- [ ] T024 [P] [US2] Evidence redaction test — tool response contains no raw provider payloads, credentials, storage paths, or unrestricted message bodies
- [ ] T025 [P] [US2] No-data test — tool with no matching records returns empty evidence and no-data text
- [ ] T026 [P] [US2] Result cap test — tool with more results than cap returns truncated response

### OAuth Tests

- [ ] T033 [P] [US3] OAuth consent test — OAuth client with valid grant can invoke tools within scope
- [ ] T034 [P] [US3] Grant revocation test — revoked grant immediately denies tool invocation
- [ ] T035 [P] [US3] Scope mismatch test — client with wrong grant cannot invoke out-of-scope tool

### LLM Evaluation Harness (US4, P2)

- [ ] T041 [P] [US4] Harness scaffold — initialize fixture data and run a dummy scenario
- [ ] T042 [P] [US4] Scoring dimensions — tool choice, arguments, auth, grounding, safety each produce a score
- [ ] T043 [P] [US4] Report output — model config, traces, checks, scores, latency, cost
- [ ] T044 [P] [US4] Implement harness — scenario runner with fixture setup, LLM invocation via OpenRouter, trace recording
- [ ] T045 [P] [US4] Career fixture scenarios — positive, no-data, denied-scope, redaction cases
- [ ] T046 [P] [US4] Workspace fixture scenarios — positive, no-data, denied-scope, redaction cases
- [ ] T047 [US4] Deterministic assertions — tool choice, arguments, authorization, evidence (gating checks)
- [ ] T048 [US4] Quality evaluator capture (advisory only) — record LLM quality scores, do not gate
- [ ] T049 [US4] Report generation — deterministic pass/fail, advisory quality, latency, cost
- [ ] T050 [US4] Configure fast PR subset (deterministic only) vs full benchmark

### Polish

- [x] T056 Implement daily cost budget throttling — query `app.ai_usage_events`, 429 if budget exceeded
- [ ] T051 [P] Update documentation — `docs/architecture.md`
- [ ] T052 [P] Run `pnpm run check` (typecheck + lint + build + test) across full workspace
- [ ] T053 [P] Run quickstart.md validation scenarios
- [ ] T054 Code cleanup and edge-case hardening
- [ ] T055 [P] Security review before enabling domain tools

---

## Dependencies & Execution Order

### MVP Delivery (Phases 1–5)

1. Phase 1: Setup — all done ✅
2. Phase 2: Foundational — all done ✅
3. Phase 3: US1 Base Server — all done ✅
4. Phase 4: US2 Privacy & Security — T028-T032 remaining
5. Phase 5: US3 OAuth — all done ✅

### Post-MVP (Phase 6)

All remaining tasks are non-blocking validation, tests, eval harness, and polish. Execute incrementally.

### Feature Summary

| Phase | Completed | Remaining |
|-------|-----------|-----------|
| Phase 1: Setup | 3/3 | 0 |
| Phase 2: Foundational | 9/9 | 0 |
| Phase 3: US1 | 7/7 | 0 |
| Phase 4: US2 | 1/6 | T028-T032 |
| Phase 5: US3 | 5/5 | 0 |
| Phase 6: Everything else | 5/29 | 24 |
| **Total (features)** | **25/30** | **5** |
| **Total (all)** | **30/59** | **29** |
