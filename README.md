# Hominem

Hominem is a product monorepo. Active products:

- **Omiro** — `apps/omiro`, the Apple-native surface
- **API** — `services/api`, identity and data authority
- **Career** — web product, server-owned data access
- **Finance** — in monorepo, release tier governed by explicit portfolio decision

## The Bible

The repository's operating law lives in `docs/`. Read the relevant part before
changing a system boundary. Package READMEs are setup entrypoints only.

### I. Product

Hominem is one product system made up of the API, Omiro, and shared packages.

#### Product today

- **API** owns identity, persistence, orchestration, and work that clients cannot be trusted to perform.
- **Career** is a web product whose data access is owned by the server.
- **Finance** is in the monorepo. Its release tier must be decided explicitly; do not infer it from a command or workflow.

- [Product philosophy](#philosophy)

### II. System

- [Architecture](./docs/architecture.md) — data flow, ownership boundaries, and open architecture decisions
- [Authentication](./docs/auth.md) — session authority, MCP OAuth, and production incident investigation
- Design system: `@ponti-studios/ui/docs/`

### III. Operations

- [Developer](./docs/developer.md) — commands, development, and deployment rules
- [Evidence](./docs/evidence.md) — validation standards before calling a change complete

### App-specific facts

Each app documents its own architecture, navigation, and behavior in its own README, not in `docs/`. Omiro's navigation, Time, Voice, native build (Sentry), and release verification facts live in [apps/omiro/README.md](./apps/omiro/README.md).

## Philosophy

This section holds Hominem's product and design opinions. The numbered documents under `docs/` describe facts, current behavior, and explicit technical decisions.

### Product

Hominem should make it easier to capture, understand, continue, and act on work. Add complexity only when it removes friction from that process.

Capture should be immediate. A person should be able to type, speak, attach context, or resume work without configuring the system first.

The product should name real things. It should not hide ordinary work behind metaphors, slogans, or invented categories.

AI should support a visible human outcome: clearer text, a continued conversation, or tasks that a person can inspect and change. AI is not a substitute for state, authority, or recovery.

A user should not lose submitted meaning when secondary automation fails. Preserve raw text before optional cleanup. If task extraction fails, show the transcript so the user can recover it.

Keep setup, permissions, and operational details out of the task surface until the person needs them.

Before adding a feature, ask:

1. What human work becomes easier?
2. What is the smallest visible outcome?
3. What can the person recover if automation, network, or permission fails?
4. Which existing product word and surface own it?

If any answer is unclear, the feature is not ready to spread across the system.

### Information design

Information should be easy to understand and accurate. Check:

- Accuracy: Is it true?
- Clarity: Can someone understand it in seconds?
- Hierarchy: What matters most?
- Context: Why does it matter?
- Flow: What happens next?

Use this approach in practice:

- Dashboards should surface the decision, not just the data.
- Presentations should focus on one idea per slide; the spoken explanation can carry nuance.
- Writing should use short paragraphs, strong topic sentences, and useful headings.
- Every product screen should answer: What do I do here and why?

### Discovery

People often do not know what they want until they see options in context. Desire responds to what is presented rather than existing fully in advance.

The hard part is often discovery, not matching. People can only choose from the options they see. There is no perfect decision process; make decisions quickly using the best information available.

People often learn what they like through repeated exposure. An experience may need to introduce an idea, reinforce it, and then give the person enough detail to decide.

### Form and focus

Digital products should use shapes that support the work. Rectangles are familiar tools for storing and viewing information. Excessive rounding can add layout constraints and make a focused tool feel designed for passive consumption.

The interface should favor precision, readable structure, and purposeful controls over decoration that does not help the user act.

### System design

Keep each responsibility in one place and make interfaces between parts explicit. Do not add layers that only rename imports.

## Architecture

```text
apps/omiro     -> Expo app, native UI, mobile-only helpers
services/api   -> Hono API, auth, data access, workers
packages/*     -> shared libraries: db, env, utils, ui, auth, rpc, telemetry, hooks, etc.
```

The default direction is from apps into shared packages, and from shared packages into `services/api` only when backend coordination is required.

## Ponti UI package

`@ponti-studios/ui` is the published Ponti Studios UI package. Install it from npm; do not copy its source into this repository.

```bash
@ponti-studios:registry=https://registry.npmjs.org
```

Consumers that need authentication should configure an npm token outside the committed project `.npmrc`.

## Commands

See [docs/developer.md](./docs/developer.md) for setup, validation, and command references.

## CI Model

The workflow is split into two layers:

- canonical checks: `Web Checks` and `API Checks`
- confidence lanes: `DB Migrations` and `E2E Web Auth`

The goal is to keep the product feedback loop focused while still preserving slower release-confidence checks.
