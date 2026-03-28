# Rebuild Reset

This repo is being rebuilt from the ground up.

Until the new foundations are in place, the repo should optimize for clarity over completeness. We are intentionally removing documents, workflows, and provider config that imply the current system is stable, deployable, or architecture-complete.

## Docs Structure

Use these categories consistently:

- Product docs: durable product intent and language, kept in `docs/`
- Rebuild docs: current reset plan and phase contracts, kept in `docs/`
- Provisional infra docs: local-only setup notes that support active development
- Historical planning docs: older exploration material kept only as history, not source of truth

During the rebuild:

- `docs/README.md` is the canonical index for durable product and rebuild docs
- root `README.md` is the canonical repo operating guide
- infra docs may describe local infrastructure only
- architecture and deployment docs should not exist unless they are explicitly marked provisional

If a doc describes a system we are replacing, it should be deleted or moved into historical planning material instead of staying in the active doc surface.

## Phase 2: DB Foundation Acceptance Contract

`stack/02-db-foundation` exists to establish the new database as the source of truth.

It is complete only when all of the following are true:

- a blank database can be created from migrations only
- migrations run deterministically on a fresh database
- generated database types match the migrated schema
- no legacy compatibility layer is introduced for old schema consumers
- downstream breakage in services, API routes, and tests is accepted as expected follow-on work

It is not responsible for:

- restoring full repo green
- preserving old table contracts
- keeping legacy route tests passing
- reintroducing deploy automation or provider config

The output of Phase 2 should be a correct schema and migration baseline, even if later phases are still required to make the rest of the monorepo compile or pass tests.

## Verification Ladder

The rebuild no longer uses full root green as the immediate bar for every phase.

Use this ladder instead:

1. Stack 01: cleanup and reset surface
   - stale deploy automation removed
   - provider config removed
   - stale architecture and observability docs removed
   - local command surface still works
2. Stack 02: DB foundation
   - fresh database bootstrap from migrations
   - migration verification passes
   - generated types match schema
3. Stack 03: auth contract
   - auth flows work against the new schema
   - auth contract tests pass
4. Stack 04 and later: service, API, feature, and test restoration
   - each phase restores only the verification appropriate to its layer
5. Final stabilization
   - full repo lint, test, and release gates return only after the rebuilt backend and test layers are back in place

Every stack should define success in terms of the layer it owns, not in terms of the legacy repo surface it is intentionally replacing.

## Defaults

- Railway remains the target host later, but no active provider runtime config should live in the repo until it is reintroduced intentionally
- Docker remains the intended build interface later, but current infra docs should describe local/provisional usage only
- PostHog and other live product instrumentation are not part of the reset cleanup unless later phases replace them intentionally
