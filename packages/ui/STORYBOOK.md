# Storybook

`packages/ui` Storybook is the source of truth for the publishable UI surface.

## Run

- `bun run --filter @hominem/ui storybook`
- `bun run --filter @hominem/ui build:storybook`
- `bun run --filter @hominem/ui test:storybook`

## Purpose

Storybook documents components that belong in `packages/ui`:

- prop-driven
- environment-agnostic
- free of app routing, RPC, auth, and DB dependencies

If a component needs router hooks, auth context, RPC clients, or environment access, it is not part of the stable publishable UI surface. Transitional stories for those components must live under `Legacy/*`.

## Taxonomy

Use one top-level title system only:

- `Primitives/*`
- `Forms/*`
- `Feedback/*`
- `Navigation/*`
- `Layout/*`
- `Typography/*`
- `Patterns/*`
- `Legacy/*`

Examples:

- `Patterns/AI/CodeBlock`
- `Patterns/Chat/ChatMessage`
- `Patterns/Overlay/Dialog`
- `Patterns/DataDisplay/Card`
- `Legacy/Auth/EmailSignIn`

## Story Rules

- Colocate stories with the component they document.
- Use `@storybook/react-vite`.
- Keep stories self-contained and prop-driven.
- Add MSW handlers at the story level only when network behavior is part of the component contract.
- Do not rely on global router or RPC providers in preview.

## Testing

Use Storybook as both documentation and a UI verification surface:

- `build:storybook` proves documentation and bundle integrity.
- `test:storybook` proves interactive story behavior through the Vitest Storybook runner.

Prefer a small number of meaningful interaction tests over broad mechanical coverage.

## Current Note

Storybook suppresses third-party Vite `"use client"` warnings in `.storybook/main.ts`. That suppression is temporary and should be removed once the remaining client-heavy edges are reduced.
