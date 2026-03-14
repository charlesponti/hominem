## 1. Release env policy

- [x] 1.1 Add a centralized mobile release env policy helper with tests for local-only and release-only variant behavior.
- [x] 1.2 Prevent preview and production variant launchers from sourcing local env files.

## 2. Release verification

- [x] 2.1 Add release env verification commands for preview and production using EAS-managed environments.
- [x] 2.2 Update build and OTA commands to validate the corresponding EAS environment before execution.

## 3. Documentation and cleanup

- [x] 3.1 Remove local preview and production env files from the supported workflow.
- [x] 3.2 Update the mobile README and CI workflow to reflect the enforced release env setup.
