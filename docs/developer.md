# V. Developer

The system is only real when a clean checkout, a deployment, and a production failure all behave as deliberately as local development.

## Developer law

- `just` and root `pnpm` scripts are the repository-level command interface. Package scripts are Turbo primitives, not contributor instructions.
- Run the smallest relevant validation lane first: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test`, each scoped with `--filter=@hominem/<package>...` (e.g. `--filter=@hominem/api...`, `--filter=@hominem/omiro...`, `--filter=@hominem/career...`, `--filter=@hominem/finance...`).
- Published shared packages expose compiled artifacts. Local development may alias a package's source for hot reload, but CI, deployables, EAS, and external consumers resolve the same compiled public exports.
- The shared UI package stays registry-resolved in manifests and lockfiles. Use `just ui link [path]`, `just ui status`, and `just ui unlink` for a reversible sibling-source link; the commands must not commit local paths.
- One Node and pnpm line governs local development, CI, Docker, Railway, and EAS. Version drift is a defect.
- `@hominem/env` owns shared environment semantics. Framework prefixes adapt a variable for a runtime; they do not invent a second meaning.

## Deployment law

Every production service has one deployment authority. A GitHub-managed Railway service must not also use Railway linked-source auto-deploy.

A deployment target is one versioned tuple:

```text
repository + logical service + immutable Railway service ID
+ checked-in configuration path + triggering workflow
```

Upload acceptance is not deployment success. Automation verifies the resolved target identity and the final remote deployment state.

## Omiro mobile delivery

Omiro uses Expo Continuous Native Generation. The checked-in source of truth is the app config, local Expo Modules, and config plugins; `apps/omiro/ios` is generated output and is excluded from Git and EAS uploads.

Portable motion contracts live in `@ponti-studios/ui` as serializable tokens. Omiro owns the Reanimated adapter, Router gestures, reduced-motion integration, and product semantics; shared UI does not import Expo Router or Reanimated.

Chat detail state is decomposed into focused hooks — `useChatData` (messages + archive), `useChatSearch` (search modal state + filtering), `useChatTransform` (chat-to-note/task lifecycle + review), and `useMessageActions` (copy/share) — instead of a monolithic `useChatController`. Pure logic that does not need React lives in `services/chat/` (e.g. `chat-search.ts` `filterMessagesByQuery`) and is unit-tested directly. `ChatDetailScreen` composes the hooks and owns only screen-local state (composer height, debug toggle).

The release path is deliberately linear:

```text
local development client -> production TestFlight candidate -> phased App Store release
```

TestFlight candidates and App Store releases use the same production bundle, backend, and native binary. There is no separate staging binary. Production builds are manual GitHub workflow dispatches protected by the `omiro-testflight` environment. The old automatic `main`-to-store path is prohibited.

The marketing version is committed in app config and EAS remotely increments only the iOS build number.

Every production change is delivered in a new TestFlight candidate, then submitted and released through App Store Connect. Only the protected GitHub deployment workflow produces or submits production archives; local builds are for simulator testing and debugging.
