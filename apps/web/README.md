# Hominem Web

A React Router web app with pnpm-based commands for local development and maintenance.

## Quick Start

```bash
pnpm install
pnpm dev
```

## How To Think About The Commands

| Need                       | Run                 | When to use it                                   |
| -------------------------- | ------------------- | ------------------------------------------------ |
| Start local development    | `pnpm dev`       | Normal day-to-day work                           |
| Build the app              | `pnpm build`     | Before deployment or to verify production output |
| Run the app after a build  | `pnpm start`     | Smoke test the built server locally              |
| Check code style           | `pnpm lint`      | Before commits and PRs                           |
| Format code                | `pnpm format`    | Fix formatting issues quickly                    |
| Check TypeScript           | `pnpm typecheck` | Before commits and PRs                           |
| Run tests                  | `pnpm test`      | Placeholder until the non-Storybook suite returns |

## Daily Workflow

For most web changes, the loop is simple:

1. Start with `pnpm dev`.
2. Run `pnpm lint` and `pnpm typecheck` before you stop.

## Workflow Guide

### Local Development

`pnpm dev` starts the React Router development server.

The web app is meant to run against the local API at `http://localhost:4040`.

### Builds

`pnpm build` produces the server and client build output.

`pnpm start` serves the built app from `build/server/index.js`.

### Testing

`pnpm test` is a placeholder until the non-Storybook suite is rewritten.

### Quality And Type Safety

`pnpm lint`, `pnpm format`, and `pnpm typecheck` cover the common pre-PR checks.

## Configuration Model

The important web files are:

- [package.json](package.json) for scripts.
- [react-router.config.ts](react-router.config.ts) for React Router wiring.
- [vite.config.ts](vite.config.ts) for build and test config.

## Troubleshooting

### Dev Server Does Not Load Data

Make sure the API is running on port 4040, or let the Playwright config start it for E2E runs.

### Typegen Looks Stale

Run `pnpm typegen` after changing routes or route exports.

## File Layout

The main web entry points are:

- [app/](app) for route modules and UI.
- [public/](public) for static assets.
- [build/](build) for generated output.

If you are unsure where to start, use `pnpm dev` and then follow the command table above.
