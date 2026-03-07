## Why

The team needs to test Apple Authentication features in development without requiring each developer to configure real Apple credentials or tunnels. Currently there's no way to develop auth features locally, forcing developers to push to staging just to test basic auth flows. A mock authentication system enables fast iteration, easier onboarding, and reduces friction in the development workflow.

## What Changes

- Implement mock Apple Authentication provider that simulates Sign in with Apple behavior
- Add authentication context/hooks for React apps that conditionally use mock or real auth
- Create environment-based configuration to switch between mock (local) and real (staging/production) auth
- Add mock user session management and token handling matching real Apple Auth responses
- Document auth setup and usage for developers

## Capabilities

### New Capabilities
- `mock-apple-auth`: Mock Apple Authentication provider that simulates the Sign in with Apple flow with configurable user data
- `local-auth-config`: Environment-based configuration system to switch between mock and real authentication
- `auth-context-hooks`: React hooks and context providers for consuming authentication state in applications

### Modified Capabilities
- `hono-rpc`: Extend RPC layer to support conditional auth endpoints (mock vs real based on environment)

## Impact

- **Client code** (`apps/notes`, `apps/rocco`, `apps/finance`): Add auth hooks/context usage in components
- **API layer** (`services/api`): Add conditional auth endpoints and mock implementations
- **Environment configuration**: New `.env.local` variables for auth mode selection
- **No breaking changes** to existing API contracts - mock auth handlers provide same interface as real auth
- **Developer experience**: Faster feedback loop, easier testing, simpler onboarding
