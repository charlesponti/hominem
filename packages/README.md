# Hominem Packages

This directory contains shared packages used throughout the monorepo. These packages export their raw source files directly, and the apps handle the building and bundling process.

## Package Structure

- `ai`: AI utilities and wrappers for OpenAI, Google AI, etc.
- `components`: React UI components
- `tsconfig`: Shared TypeScript configurations
- `utils`: Shared utilities for various domains (finance, jobs, etc.)

## Development Guidelines

### Source-only Packages

Packages in this monorepo follow a source-only approach:

- Packages export TypeScript source files directly
- App bundlers (Vite, Next.js, etc.) handle transpilation
- No build step in the packages themselves
- Faster development cycle with no need for rebuilding packages

### Exports Configuration

Packages use subpath exports to provide a clean API surface:

```json
"exports": {
  ".": "./src/index.ts",
  "./feature": "./src/feature/index.ts" 
}
```

### Dependency Management

- Use `workspace:*` for internal dependencies
- React and similar libraries should be peerDependencies
- Use consistent TypeScript version across packages

### Standard Scripts

Each package provides these scripts:

- `lint`: Lint the package code
- `format`: Format the package code
- `typecheck`: Type check without emitting files
- `test`: Run tests (if applicable)

### Build Process

- The build process happens at the app level, not the package level
- Apps include and transpile the package source code directly
- This ensures consistent transpilation and bundling
- Prevents issues with mismatched build targets