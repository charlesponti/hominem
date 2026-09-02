# Hominem Web

A React Router web app with pnpm-based commands for local development and maintenance.

## Quick Start

```bash
pnpm install
pnpm dev
```

## How To Think About The Commands

| Need                      | Run              | When to use it                                    |
| ------------------------- | ---------------- | ------------------------------------------------- |
| Start local development   | `pnpm dev`       | Normal day-to-day work                            |
| Build the app             | `pnpm build`     | Before deployment or to verify production output  |
| Run the app after a build | `pnpm start`     | Smoke test the built server locally               |
| Check code style          | `pnpm lint`      | Before commits and PRs                            |
| Format code               | `pnpm format`    | Fix formatting issues quickly                     |
| Check TypeScript          | `pnpm typecheck` | Before commits and PRs                            |
| Run tests                 | `pnpm test`      | Placeholder until the non-Storybook suite returns |

## Daily Workflow

For most web changes, the loop is simple:

1. Start with `pnpm dev`.
2. Run `pnpm lint` and `pnpm typecheck` before you stop.

## Workflow Guide

### Local Development

`pnpm dev` starts the React Router development server.

Under `pnpm dev`, the web app runs through the portless proxy at
`https://web.lvh.me:4200` and talks to the API at
`https://api.lvh.me:4200` (see the `hominem-development` skill). The API
process itself still binds plain `http://localhost:4040` underneath.

### Browser E2E

With the API running in scripted mode and the Web app running, prepare the
disposable authenticated session and run the recovery flows:

```sh
eval "$(pnpm --filter @hominem/api --silent e2e:setup 2>/dev/null | grep 'export ')"
pnpm --filter @hominem/web test:e2e
```

The Playwright suite runs B-001 through B-025 in playbook order using the
running services; it does not start or stop them. Set `WEB_URL` to target
another local Web URL. To rerun one scenario while debugging, use for example:

```sh
pnpm --filter @hominem/web test:e2e --project=chat -g 'B-013'
```

The suite attaches one JSON evidence record and a full-page DOM/screenshot
artifact for every scenario. Traces and videos are retained for failures.
B-020 and B-021 are reported as skipped when the server-side chat loader cannot
be intercepted by Playwright; the skip includes that exact harness limitation.

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

Make sure the API is running (`pnpm --filter @hominem/api dev`, reachable at `https://api.lvh.me:4200` under portless), or let the Playwright config start it for E2E runs.

### Typegen Looks Stale

Run `pnpm typegen` after changing routes or route exports.

## File Layout

The main web entry points are:

- [app/](app) for route modules and UI.
- [public/](public) for static assets.
- [build/](build) for generated output.

If you are unsure where to start, use `pnpm dev` and then follow the command table above.
