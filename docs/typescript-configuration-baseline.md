# TypeScript Configuration Baseline (Bun + Vite + Expo)

This document defines the monorepo TypeScript baseline for editor stability, build correctness, and tsserver performance.

## 1) Solution Strategy

- Keep root solution references in `tsconfig.json`.
- Use a focused editor solution in `tsconfig.editor.json` for daily development.
- Keep both files with:
  - `disableReferencedProjectLoad: true`
  - `disableSolutionSearching: true`

## 2) Project Graph Rules

- Use `composite: true` for referenced workspace projects.
- Use `disableSourceOfProjectReferenceRedirect: true` to prefer declaration boundaries over source redirects.
- Avoid cross-package source aliases (e.g. `../other-package/src/*`) unless absolutely required.

## 3) Resolution Rules

- Use `moduleResolution: "Bundler"` for app/service/package projects targeting Bun/Vite/Expo pipelines.
- Keep `baseUrl` only where alias paths are actively used.
- Keep `paths` only for live aliases used in imports.
- Remove empty `paths` objects.

## 4) File Scope Rules

- Keep `include` tight to project sources/config files only.
- Avoid globally including `../../types/**/*.d.ts` in every project.
- Keep ambient global type includes only in projects that truly require them.

## 5) Module Semantics

- Use `moduleDetection: "force"` across all TS projects.
- Keep `verbatimModuleSyntax: true` and `isolatedModules: true` for modern ESM behavior.

## 6) Editor Runtime Rules

Workspace `.vscode/settings.json` should keep:

- `typescript.tsdk: "node_modules/typescript/lib"`
- `typescript.disableAutomaticTypeAcquisition: true`
- `typescript.tsserver.useSyntaxServer: "auto"`
- `typescript.tsserver.experimental.enableProjectDiagnostics: false`
- `typescript.preferences.includePackageJsonAutoImports: "off"`

## 7) Validation Checklist

From repo root:

- `npx tsc -b tsconfig.json --pretty false`
- `bun run typecheck`
- `bun run check`

Any TS config change should pass all three.

## 8) Non-Goals

- Do not add blanket path aliases for convenience.
- Do not increase tsserver memory as the first response.
- Do not loosen strictness to mask project-graph issues.
