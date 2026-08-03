# Omiro

The mobile app is an Expo app that targets iOS only.

Its governing product, UI, and voice architecture live in the repository
[Bible](../../README.md#the-bible), not in an app-local documentation directory.

## Quick Start

```bash
just setup
just mobile prebuild development
just mobile dev
```

For production release work, use the production native identity:

```bash
just mobile prebuild production
```

## API configuration

`EXPO_PUBLIC_API_BASE_URL` is the sole API address used by the app. Set it in
`.env.development.local`: use `http://localhost:4040` for the iOS Simulator,
or a reachable LAN/tunnel URL for a physical device. Production builds receive
the value from the EAS production environment.

## Working In Zed

Zed can edit the TypeScript/React Native sources directly, but Swift diagnostics for the native modules only work after the generated iOS project exists locally.

If you open one of the files under `modules/*/ios/*.swift` before bootstrapping the native project, Zed may show:

> `No such module 'ExpoModulesCore'`

That error usually means the iOS workspace has not been generated yet, or CocoaPods have not been installed for the local `apps/omiro/ios` directory.

### Recommended setup

1. Install the repo dependencies with `just setup`.
2. Generate the iOS project with `just mobile prebuild development`.
   For production release work, use `just mobile prebuild production` instead so the local `ios` tree matches the store-facing identity.
3. Run the iOS app with `just mobile dev` when you want Expo to finish wiring the native project and launch the app.
4. Open the repo root in Zed after the iOS project has been generated so SourceKit can resolve the native modules.

## Troubleshooting

### `No such module 'ExpoModulesCore'`

- Make sure you have generated the iOS project locally with `just mobile prebuild development`.
- For production build work, regenerate with `just mobile prebuild production` before testing.
- Make sure Xcode command line tools are installed and selected.
- Re-run `just mobile dev` so Expo can refresh the iOS workspace and Pods.

If the error still appears, the local generated `apps/omiro/ios` directory is likely stale and should be regenerated.

## Useful Commands

| Need                                | Run                                           | When to use it                                                     |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Generate the dev iOS project        | `just mobile prebuild development`            | First-time setup or after native config changes during development |
| Generate the production iOS project | `just mobile prebuild production`             | Local CNG verification before a native release                     |
| Launch the iOS app                  | `just mobile dev`                             | Daily mobile development                                           |
| Create and submit a production build | GitHub `deploy-mobile` workflow               | App Store/TestFlight release builds                                |
| Start Metro / Expo                  | `just mobile start`                           | When you want to attach to an existing native build                |
| Read Omiro's governing decisions    | [Repository Bible](../../README.md#the-bible) | Before changing product, UI, or voice behavior                     |
