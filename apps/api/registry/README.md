# Components Registry API

This API serves shadcn/ui compatible component registry files that can be consumed by the shadcn CLI.

## Endpoints

### GET /components/use-api-client.json

Serves the `use-api-client` hook registry configuration.

**Response:**
```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "use-api-client",
  "type": "registry:hook",
  "title": "API Client Hook",
  "description": "React hook for API client that handles fetch requests with Supabase authentication",
  "dependencies": [
    "@supabase/supabase-js@latest",
    "react@^18.0.0"
  ],
  "registryDependencies": [],
  "files": [...],
  "docs": "..."
}
```

### GET /components/

Lists all available components in the registry.

**Response:**
```json
{
  "components": [
    {
      "name": "use-api-client",
      "title": "API Client Hook",
      "description": "React hook for API client that handles fetch requests with Supabase authentication",
      "url": "/components/use-api-client.json"
    }
  ],
  "count": 1
}
```

## Usage with shadcn CLI

To use these components, you can add them to your project using:

```bash
npx shadcn@latest add https://api.ponti.io/components/use-api-client.json
```

Or if you're setting up a custom registry:

```bash
npx shadcn@latest init
# Then edit components.json to point to https://api.ponti.io/components as a registry
```

## Registry Structure

Registry files are stored in the `/registry` directory at the API root:

```
apps/api/
├── registry/
│   └── use-api-client.json
└── src/
    └── routes/
        └── components/
            └── index.ts
```

## Adding New Components

1. Create a new registry JSON file in `/apps/api/registry/`
2. Add the route handler in `/apps/api/src/routes/components/index.ts`
3. Update the components list in the main endpoint
4. Add tests in `/apps/api/test/components.test.ts`

## Headers

All responses include:
- `Content-Type: application/json`
- `Cache-Control: public, max-age=3600` (1 hour cache)
