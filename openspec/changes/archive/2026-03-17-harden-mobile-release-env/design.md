## Context

The mobile repo already distinguishes runtime variants, but the operational boundary between local development envs and release envs is still porous. Preview and production can be influenced by local `.env` files, while EAS cloud environments are not consistently validated before release commands. This led to runtime version mismatches when local and cloud configs diverged.

## Goals / Non-Goals

**Goals:**
- Make `dev` and `e2e` the only variants that source local env files.
- Require preview and production release commands to validate the corresponding EAS environment before running.
- Document one clear env matrix for local work versus release work.

**Non-Goals:**
- Changing mobile feature behavior beyond env-source selection and validation.
- Managing Apple credentials or App Store Connect metadata.
- Reworking unrelated web or server env configuration.

## Decisions

Introduce a small release env policy helper that classifies variants and defines minimum required release env vars. Use it both in tests and in shell scripts so the policy stays centralized.

Update variant launcher scripts so preview and production cannot source local env files at all. This turns accidental laptop-specific release configuration into an immediate error instead of a latent release bug.

Use `eas env:exec` to validate the actual EAS `preview` and `production` environments before build and OTA commands. This checks the cloud source of truth rather than only the local shell state.

Remove local preview and production env files from the supported repo workflow and update the README to explain the release env contract.

## Risks / Trade-offs

- Release commands now depend on EAS env configuration being populated -> Mitigation: fail fast with explicit verification before expensive build/update work.
- Removing local preview/production env files may surprise developers used to the old workflow -> Mitigation: document the new matrix and keep `dev`/`e2e` unchanged.
- `eas env:exec` adds a networked preflight step -> Mitigation: limit it to release variants where reproducibility matters more than raw speed.
