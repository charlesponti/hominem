# CLI Migration: SQLite to API Integration

## Overview

The CLI has been migrated from using a local SQLite database to communicating with the hominem API. This ensures data consistency across all applications in the hominem ecosystem.

## Breaking Changes

### Removed
- Local SQLite database (`db.sqlite`)
- `markdownEntries` schema
- Direct database operations
- `db:update` script
- SQLite dependencies (`@libsql/client`, `drizzle-orm`)

### Added
- API client for content management
- Content API routes in the main API
- Environment variables for API configuration

## Configuration

Create or update your `.env` file in `~/.hominem/.env`:

```bash
# API Configuration
API_URL=http://localhost:3000  # or your API URL
AUTH_TOKEN=your_auth_token_here  # optional, for authenticated requests

# Existing configuration
OPENAI_API_KEY=your_openai_key_here
```

## Content Management

The CLI now creates content via the API with the following mapping:

### From `markdownEntries` to Content API:
- **Paragraphs**: Created as `type: 'note'` with section as title
- **Bullet Points**: Created as `type: 'task'` (if task detected) or `type: 'note'`
- **Tasks**: Automatically detected and created with proper task metadata
- **Tags**: Automatically tagged with `markdown-import` and content type

### API Endpoints Available:
- `GET /api/content` - List all content
- `POST /api/content` - Create new content
- `GET /api/content/:id` - Get specific content
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

## Authentication

The CLI uses bearer token authentication. You can either:

1. Set `AUTH_TOKEN` in your environment variables
2. Pass token when initializing the API client programmatically

## Data Migration

If you have existing data in the SQLite database, you'll need to:

1. Export your existing data before updating
2. Use the API to recreate the content
3. Remove the old `db.sqlite` file

## Development

The API must be running for the CLI to function. Start the API server:

```bash
cd apps/api
npm run dev
```

Then use the CLI as normal:

```bash
hominem thoth group-markdown-by-heading ./your-markdown-files
``` 
