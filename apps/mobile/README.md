# Hominem Mobile (iOS)

This app is the iOS mobile client for Hominem, built with Expo Router and the shared Hominem RPC/auth stack.

## Runtime Scope

- Production target: iOS only
- Authentication: Supabase OAuth (Apple provider) with PKCE
- API: `@hominem/hono-rpc` via `@hominem/hono-client`

## Required Environment Variables

Set these in your shell or EAS profile before running:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Development

From monorepo root:

```bash
bun run dev --filter mobile
```

Or from this app directory:

```bash
bun run start
```
