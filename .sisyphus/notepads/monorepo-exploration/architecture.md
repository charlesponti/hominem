# Hominem Monorepo Architecture Analysis

**Generated:** 2026-01-30  
**Repository:** https://github.com/charlesponti/hominem  
**Package Manager:** Bun 1.3.0+  
**Node Version:** >=20.0.0

## MONOREPO STRUCTURE

### Directory Layout
```
hominem/
├── apps/                    # User-facing applications (3)
│   ├── rocco/              # Main React Router app (maps, events, places)
│   ├── notes/              # Notes app with AI integration
│   └── finance/            # Finance/budgeting app
├── packages/               # Shared libraries (18 packages)
│   ├── db/                 # Drizzle ORM schemas & database
│   ├── hono-rpc/           # Hono + tRPC server routers
│   ├── hono-client/        # tRPC client for React
│   ├── auth/               # Supabase Auth utilities
│   ├── ui/                 # Shadcn UI components
│   ├── utils/              # Utility functions
│   ├── services/           # Business logic & services
│   ├── ai/                 # AI/LLM utilities
│   └── *-services/         # Domain-specific services (11 packages)
├── services/               # Standalone services (2)
│   ├── api/                # Main Hono API server
│   └── workers/            # Background job workers (BullMQ)
├── tools/                  # CLI & utilities (1)
│   └── cli/                # Command-line interface
└── [config, migrations, docker, scripts]
```

## PACKAGE INVENTORY

### Applications (3)
- `@hominem/rocco` - Main dashboard/maps app
- `@hominem/notes` - Note-taking with AI
- `@hominem/finance` - Finance/budgeting

### Services (2)
- `@hominem/api` - Main Hono API (tRPC routers)
- `@hominem/workers` - Background jobs (BullMQ)

### Tools (1)
- `@hominem/cli` - Command-line interface

### Core Packages (7)
- `@hominem/db` - Database (Drizzle ORM)
- `@hominem/hono-rpc` - Server routers
- `@hominem/hono-client` - React client
- `@hominem/auth` - Authentication
- `@hominem/ui` - UI components
- `@hominem/utils` - Utilities
- `@hominem/services` - Business logic

### Domain Services (11)
- `@hominem/ai` - AI/LLM utilities
- `@hominem/career-services` - Career management
- `@hominem/chat-services` - Chat functionality
- `@hominem/events-services` - Event management
- `@hominem/finance-services` - Finance operations
- `@hominem/health-services` - Health tracking
- `@hominem/invites-services` - Invitation system
- `@hominem/jobs-services` - Job queue operations
- `@hominem/lists-services` - List management
- `@hominem/notes-services` - Note operations
- `@hominem/places-services` - Location/places

## CRITICAL DEPENDENCIES

**Pinned Versions:**
- React: ^19.2.3
- React Router: 7.12.0
- Hono: 4.11.6
- Drizzle ORM: 0.45.1
- Zod: 4.3.6
- TypeScript: 5.9.3
- React Query: 5.90.16
- Vitest: 4.0.16
- Turbo: ^2.7.4

## ARCHITECTURE PATTERNS

### API (Hono + tRPC)
- Server routers in `packages/hono-rpc/src/routes/`
- React hooks in `packages/hono-client/src/react/`
- Main server: `services/api/src/index.ts`

### Database (Drizzle ORM)
- Schemas in `packages/db/src/schema/`
- Schema-first with migrations
- Commands: `db:generate`, `db:migrate`, `db:push`, `db:studio`

### State Management
- Global UI: Zustand
- Server Data: React Query + IndexedDB
- Auth: Supabase Auth

### Testing
- Framework: Vitest 4.0.16
- Coverage: V8
- Workspace: 9 projects in `vitest.workspace.ts`

## BUILD & SCRIPTS

### Root Commands (Turbo)
```bash
bun run dev              # All services
bun run build            # All packages
bun run test             # All tests
bun run lint --parallel  # Lint all
bun run format           # Format all
bun run typecheck        # Type check
bun run check            # lint + typecheck + test
```

### Database Commands
```bash
bun run db:generate      # Generate migrations
bun run db:migrate       # Apply migrations
bun run db:push          # Push schema
bun run db:studio        # Open Drizzle Studio
```

## CODE STYLE

**Formatting:**
- 2 spaces indentation
- No semicolons
- Single quotes for code, double for JSX
- oxlint + oxfmt (Rust-based)

**Naming:**
- `camelCase` for variables/functions
- `PascalCase` for components
- `UPPER_CASE` for constants
- `is/has/can` for booleans

**TypeScript:**
- No `any` type (ever)
- Type imports: `import type { ... }`
- Interfaces for objects, type aliases for unions
- Utility types: `Pick`, `Omit`, `Partial`, `Record`

## ISSUES & INCONSISTENCIES

### Strengths
✅ Clear separation of concerns
✅ Consistent tooling (Turbo, Vitest, oxlint)
✅ Strong type safety (no `any`, Zod validation)
✅ Modern stack (React 19, React Router 7, Hono 4.11.6)

### Issues
⚠️ No test files found (0 `.test.ts` files discovered)
⚠️ Service naming inconsistency (`@hominem/ai` vs `*-services`)
⚠️ Limited path aliases in `tsconfig.base.json`
⚠️ Minimal API documentation
⚠️ Potential circular dependencies with 11 domain services

### Observations
- Tests may be named `.spec.ts` or not yet written
- Apps depend on 11+ workspace packages (normal but increases build time)
- Heavy AI/LLM integration across packages
- Large dependency tree but well-organized

## ENVIRONMENT VARIABLES

**Global (Turbo):**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
VITE_APP_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
DATABASE_URL, GITHUB_TOKEN
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
OPENAI_API_KEY, OPENAI_ORG_ID
REDIS_URL, RESEND_API_KEY
```

**MCP Server:**
- Path: `~/.hominem/config.json`
- Format: `{ "token": "YOUR_TOKEN_HERE" }`
- Overrides: `HOMINEM_API_HOST`, `HOMINEM_API_PORT`

## ENTRY POINTS

**Apps:**
- rocco: `apps/rocco/app/root.tsx`
- notes: `apps/notes/app/root.tsx`
- finance: `apps/finance/app/root.tsx`

**Services:**
- API: `services/api/src/index.ts` (port 4040)
- Workers: `services/workers/src/index.ts`

**Packages:**
- db: `src/index.ts`
- hono-rpc: `src/index.ts`
- hono-client: `src/react/index.ts`
- auth: `src/index.ts`
- ui: `src/index.ts`
- utils: `src/index.ts`
- services: `src/index.ts`

## NEXT STEPS

1. Add missing tests (target 70%+ coverage)
2. Standardize service naming (`@hominem/ai` → `@hominem/ai-services`)
3. Expand path aliases in `tsconfig.base.json`
4. Add JSDoc comments to public APIs
5. Run `bun run type-audit` for performance optimization
6. Set up CI/CD with GitHub Actions
