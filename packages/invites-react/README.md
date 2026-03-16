# @hominem/invites-react

React components and hooks for invite management.

## Exports

### Components
- `Invites.Received.*` - Received invite components (invite item, empty state)
- `Invites.Sent.*` - Sent invite components (form, item, list)
- `Invites.Actions.*` - Invite action components (delete invite)

### Hooks
- `useInvites` - Invite operations (send, accept, decline, cancel)

## Dependencies

- `@hominem/ui` - UI primitives
- `@hominem/invites-services` - Backend services
- `@hominem/hono-client` - API client
- `@hominem/hono-rpc` - RPC types
- `@tanstack/react-query` - Data fetching
