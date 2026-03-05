# Capability Modernization Artifacts

These files are the implementation source of truth for capability-first modernization.

Execution order:
1. `auth.md`
2. `chat.md`
3. `notes.md`
4. `calendar.md` (canonical; replaces legacy `events` surface)
5. `lists.md`
6. `places.md`
7. `finance.md`

Rules:
- No shims/adapters/legacy alias exports
- RED tests must target the modernized contract (not automatic legacy parity)
- Integration-first testing: capability tests are DB-backed slice tests by default
- Unit tests are only for isolated pure logic and should not duplicate integration coverage
- GREEN code must satisfy the frozen contract only
