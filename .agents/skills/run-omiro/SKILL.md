---
name: run-omiro
description: Build, run, and screenshot the omiro Expo/React Native app on the iOS Simulator. Use when asked to run omiro, start the mobile app, launch it on the simulator, take a screenshot of the app UI, or verify a mobile change actually works.
---

Omiro is an Expo (React Native) dev-client app. Drive it with
`.claude/skills/run-omiro/driver.sh` — it wraps `expo run:ios`,
`xcrun simctl`, and the Metro bundler into single commands so an agent
doesn't have to babysit background processes or guess simulator UDIDs.

All paths below are relative to `apps/omiro/` (this skill's grandparent
directory). macOS + Xcode + a simulator runtime are required — there is
no Linux/headless path for iOS Simulator builds.

## Prerequisites

- Xcode installed with at least one iOS Simulator runtime (`xcrun simctl list devices available`).
- The repo's API service reachable at `http://localhost:4040` (or whatever `EXPO_PUBLIC_API_BASE_URL` you set) — check with `driver.sh status`. Without it, screens that fetch data will error, though the app still boots.
- pnpm deps installed at the repo root (`pnpm install`).

## Setup

```bash
.claude/skills/run-omiro/driver.sh env
```

Copies `.env.example` → `.env.development.local` if missing, and strips
the placeholder `EXPO_PUBLIC_SENTRY_DSN` line (see Gotchas — a
placeholder or empty value there crashes every route).

## Run (agent path)

First build (only needed once per native-project reset — Expo dev
clients don't need rebuilding for JS-only changes):

```bash
.claude/skills/run-omiro/driver.sh build      # boots a sim, expo run:ios, installs, launches
```

Day-to-day (JS-only changes, app already installed):

```bash
.claude/skills/run-omiro/driver.sh metro      # idempotent: starts Metro in bg if not already up
.claude/skills/run-omiro/driver.sh launch     # terminate + relaunch, reconnects to Metro
.claude/skills/run-omiro/driver.sh screenshot /tmp/omiro.png
```

Or all at once from a cold start:

```bash
.claude/skills/run-omiro/driver.sh all
```

| command             | what it does                                                                          |
| ------------------- | ------------------------------------------------------------------------------------- |
| `env`               | writes/fixes `.env.development.local`                                                 |
| `boot`              | boots a simulator if none is booted, prints UDID                                      |
| `build`             | `expo run:ios`; falls back to manual `simctl install` if devicectl install fails      |
| `metro`             | starts `expo start --clear` in background, waits for `:8081/status` to report running |
| `launch`            | `simctl terminate` + `simctl launch` the installed app (reconnects to Metro)          |
| `screenshot [path]` | `simctl io screenshot`, default `/tmp/omiro-sim.png`                                  |
| `status`            | prints booted simulator, Metro status, API reachability                               |
| `all`               | env → boot → metro → build → launch → screenshot                                      |

Metro log: `/tmp/omiro-metro.log`. Metro pid: `/tmp/omiro-metro.pid`.

After `launch`, wait ~5-10s before screenshotting — the JS bundle needs
a moment even when Metro's cache is warm.

## Run (human path)

```bash
APP_ENV=development npx expo run:ios --device "iPhone 17 Pro"
```

Opens the Simulator app and a Metro terminal UI; leave running, `Ctrl-C`
to stop. Useless for an agent (interactive, blocks the shell) — use the
driver instead.

## Test

```bash
pnpm --filter=@hominem/omiro test
```

## Gotchas

- **`expo run:ios --device "iPhone 17 Pro"` can target a _shutdown_
  simulator** when more than one device shares that name (this
  project's simctl list had two "iPhone 17 Pro" entries). The install
  step then fails with `ERROR: The capability "Install Application" is
not supported by this device.` — devicectl refuses to install onto a
  non-booted device. `driver.sh build` boots a simulator by name
  _first_ and installs manually via `simctl install` + `simctl launch`
  as a fallback if `expo run:ios`'s own install step fails.
- **Empty/placeholder `EXPO_PUBLIC_SENTRY_DSN` crashes every route.**
  The env schema (`env.ts`) declares it `z.url().optional()` —
  `.optional()` only tolerates an _absent_ key, not `""` or the
  `.env.example` placeholder string. Either fails Zod validation and
  every route throws `Cannot read property 'ErrorBoundary' of
undefined` before rendering anything. Delete the line outright
  rather than blanking its value.
- **Missing `EXPO_PUBLIC_API_BASE_URL` fails the same way** — the app
  never gets past the splash screen, with a `ZodError: Missing
EXPO_PUBLIC_API_BASE_URL` repeated once per route in the Metro log.
  Always run `driver.sh env` before first launch.
- **A relaunch right after `expo start --clear` shows only the splash
  screen for several seconds** — Metro is bundling on first connect
  even though the CLI already printed "Waiting on http://localhost:8081".
  Don't screenshot immediately after `launch`; poll or sleep ~5-10s.

## Troubleshooting

- **`Error: ERROR: The capability "Install Application" is not
supported by this device.`**: target simulator wasn't booted. Run
  `driver.sh boot` before `build`, or use `driver.sh build` which does
  this automatically.
- **`[ZodError: ... "Missing EXPO_PUBLIC_API_BASE_URL"]` spamming the
  Metro log, app stuck on splash**: run `driver.sh env`, then restart
  Metro (`pkill -f "expo start"` then `driver.sh metro`) and
  `driver.sh launch` again — Metro caches env at startup, so an env
  fix requires a Metro restart, not just an app relaunch.
- **`[ZodError: ... "EXPO_PUBLIC_SENTRY_DSN" ... Invalid URL]`**: same
  fix — the var is present but invalid; `driver.sh env` deletes it.
