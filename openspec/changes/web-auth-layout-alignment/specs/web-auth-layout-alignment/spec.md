# web-auth-layout-alignment Specification

## Purpose
Ensure all web auth surfaces use a dedicated shared route layout instead of inheriting authenticated app chrome.

## Requirements

### Requirement: Web auth routes use a dedicated auth layout boundary
All web app auth entry and verification routes MUST render outside authenticated app layouts.

#### Scenario: Finance auth page renders
- **WHEN** a signed-out user visits `/auth` in `finance`
- **THEN** the page renders without the finance app shell navigation layout

#### Scenario: Notes auth page renders
- **WHEN** a signed-out user visits `/auth` in `notes`
- **THEN** the page renders without the notes app shell navigation layout

#### Scenario: Rocco auth page renders
- **WHEN** a signed-out user visits `/auth` in `rocco`
- **THEN** the page continues rendering outside the authenticated app shell

### Requirement: Shared auth surfaces align consistently
All web auth entry and verification screens MUST use shared auth layout primitives so spacing and auxiliary UI remain consistent across apps.

#### Scenario: Shared auth shell wraps auth screens
- **WHEN** any web auth page renders
- **THEN** it uses the shared auth route layout component in addition to the shared auth form scaffold

### Requirement: React Doctor runs locally in the monorepo
The repo MUST provide a supported command for running React Doctor without failing on workspace override resolution.

#### Scenario: Local auth layout audit
- **WHEN** a developer runs the repo’s React Doctor command from the monorepo root
- **THEN** the command starts successfully without the current `npx` override conflict
