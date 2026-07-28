# Hominem API

A Hono API with shared authentication, data access, and worker integrations.

## Quick Start

```bash
just setup
pnpm --filter @hominem/api dev
```

## How To Think About The Commands

| Need                    | Run                                      | When to use it                          |
| ----------------------- | ---------------------------------------- | --------------------------------------- |
| Start local development | `pnpm --filter @hominem/api dev`         | Normal day-to-day API work              |
| Check the API           | `pnpm lint --filter=@hominem/api...` etc | Before commits and PRs                  |
| Run API tests           | `pnpm test --filter=@hominem/api...`     | Run the test profile and API test suite |
| Format repo code        | `pnpm format`                            | Apply formatting                        |
| Check formatting        | `pnpm format:check`                      | Validate formatting without edits       |

## Daily Workflow

For most API changes, the loop is simple:

1. Start with `pnpm --filter @hominem/api dev`.
2. Run `pnpm lint --filter=@hominem/api... && pnpm typecheck --filter=@hominem/api... && pnpm build --filter=@hominem/api... && pnpm test --filter=@hominem/api...` before you stop.

## Workflow Guide

### Local Development

`pnpm --filter @hominem/api dev` starts the API in watch mode through Turbo.

The API listens on `http://localhost:4040`.

### Testing

`pnpm test --filter=@hominem/api...` supplies the checked-in test database and auth test
profile. Do not run the API test script directly against an ambient `DATABASE_URL`.

### Quality And Type Safety

`pnpm format:check`, `pnpm lint`, `pnpm typecheck --filter=@hominem/api...`,
`pnpm build --filter=@hominem/api...`, and `pnpm test --filter=@hominem/api...` together
cover format checking, linting, typechecking, building, and tests.
Use `pnpm lint:fix` or `pnpm format` for the two source-modifying operations.

## Configuration Model

The important API files are:

- [package.json](package.json) for scripts.
- [src/index.ts](src/index.ts) for server startup.
- [test/](test) for test setup and helpers.
- [vitest.config.mts](vitest.config.mts) for unit tests.

## Troubleshooting

### Port 4040 Is Busy

`pnpm dev` already clears the port before starting, but you can check for a stuck process if the server still fails to start.

## File Layout

The main API entry points are:

- [src/](src) for the server and routes.
- [test/](test) for test setup and support files.
- [Dockerfile](Dockerfile) for container builds.

If you are unsure where to start, use `pnpm --filter @hominem/api dev` and then follow the command table above.
