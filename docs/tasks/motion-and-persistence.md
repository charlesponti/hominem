---
title: 'Add web chat motion and persistence parity'
status: 'Blocked'
priority: 'medium'
labels: [web, chat, motion, persistence]
depends_on: []
blocks: [web-chat-verification.md]
estimated_size: 'M'
---

## Outcome

Web chat provides approved entrance motion, reduced-motion behavior, draft
persistence, resume targeting, and correct restored-versus-initial loading
semantics without delaying core interaction.

## Scope

In scope: message entrance, reduced motion, draft/resume persistence, and
loading semantics. Out of scope: new navigation or server architecture.

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Confirm motion contract | Web design/docs | — | [chat.design.md#web-parity](../chat.design.md#web-parity) | **OPEN — USER DECISION REQUIRED.** Adapted from Omiro's contract; human design sign-off is still required. |
| W-002 | Implement motion | Web chat transcript | W-001 | `use-new-message-ids.ts`/`.test.ts`, `chat-message.tsx` (`AnimatePresence initial={isNewMessage}`), e2e B-027/B-028 | Implementation exists, pending W-001 approval. |
| W-003 | Implement persistence | Web composer/lifecycle | W-001 | `use-chat-composer-state.ts`/`.test.tsx`, e2e B-026 | Implementation exists, pending W-001 approval. |
| W-004 | Separate loading modes | Web routes/hooks | W-002, W-003 | `compute-chat-load-state.ts`/`.test.ts` | Implementation exists, pending W-001 approval. |

## Acceptance criteria

| AC | Criterion | Enforced by |
| --- | --- | --- |
| AC-001 | A submitted message has one visible transcript representation | `apps/web/tests/e2e/chat-playbook.spec.ts` (B-001–B-025, e.g. B-002, B-014) |
| AC-002 | Reduced motion removes travel while retaining state feedback | `apps/web/tests/e2e/chat-playbook.spec.ts` B-027 |
| AC-003 | Reload preserves only approved draft and resume state | `apps/web/tests/e2e/chat-playbook.spec.ts` B-026; `apps/web/app/lib/hooks/use-chat-composer-state.test.tsx` |
| AC-004 | Motion never delays core interaction or recovery | `apps/web/tests/e2e/chat-playbook.spec.ts` B-028 |

## Exit gate

Close only with the tests below green — not with prose describing a manual
session. Run:

```bash
cd apps/web
eval "$(pnpm --filter @hominem/api --silent e2e:setup 2>/dev/null | grep 'export ')"
eval "$(E2E_TEST_EMAIL=e2e-collaborator@test.hakumi.io E2E_EXPORT_PREFIX=E2E_COLLABORATOR pnpm --filter @hominem/api --silent e2e:setup 2>/dev/null | grep 'export ')"
npx playwright test --config playwright.config.ts
```

The API dev server must be running with `ENV=scripted` (selects the scripted
AI/email providers the playbook asserts against — see
`services/api/AGENTS.md`). Smallest-viewport coverage is B-024 (existing);
new-message entrance and reduced motion are B-026–B-028 (added this task).

**Known blocker, not part of this task's scope**: in this session's dev
environment (Node 24.18.0, `msw` 2.15.0), the scripted OpenRouter mock
(`services/api/src/testkit/openrouter.mock.ts`, installed via
`installOpenRouterMock()` when `ENV=scripted`) silently fails to intercept —
requests fall through to the real OpenRouter API instead of returning
`Scripted response: ...` text (`onUnhandledRequest: 'bypass'` hides this).
Confirmed pre-existing and unrelated to this task: the baseline `B-001` test
fails identically with or without this task's changes. File this as its own
fix if CI doesn't already avoid it (different Node version, most likely).
