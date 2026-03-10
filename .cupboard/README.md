# Cupboard - Environment Variable Management

Cupboard is a CLI tool for managing shared environment variables across multiple services in the Hominem monorepo. It provides a centralized way to store, share, and sync environment variables to both local `.env.production` files and Railway.

## Concepts

### Shared Variables

Shared variables are stored in `.cupboard/keys.json` and can be shared across multiple services. This is similar to Railway's project-level variables that services can reference via `${{VAR_NAME}}`.

```
.cupboard/
  keys.json           # Source of truth for shared variables

services/api/.env.production        # Generated from shared + service-specific
apps/rocco/.env.production          # Generated from shared + service-specific
```

## Installation

The script is already available at `scripts/cupboard.ts`. You can run it with Bun:

```bash
bun scripts/cupboard.ts <command>
```

## Quick Start

### 1. View Current Shared Variables

```bash
# List all shared variables
bun scripts/cupboard.ts list

# List variables shared with a specific service
bun scripts/cupboard.ts list api
```

### 2. Add a Shared Variable

```bash
# Add interactively (prompts for services)
bun scripts/cupboard.ts add DATABASE_URL

# Add with specific services
bun scripts/cupboard.ts add DATABASE_URL -s api -s workers
```

### 3. Import from Root .env.production

```bash
bun scripts/cupboard.ts add --from-root
```

This will prompt you for each variable in `.env.production` and which services should have access.

### 4. Export to Local Files

```bash
bun scripts/cupboard.ts export local
```

This generates `.env.production` files for each service by merging shared variables (defined in cupboard) with service-specific variables.

### 5. Export to Railway

```bash
bun scripts/cupboard.ts export railway
```

This syncs shared variables to Railway at the project level. Each service that uses the variable will have it available.

## Commands

### `add <VAR> [options]`

Add a new shared variable.

**Options:**
- `-s, --service <name>`: Share with specific service(s)
- `--from-root`: Import from root `.env.production` file

**Examples:**
```bash
bun scripts/cupboard.ts add DATABASE_URL
bun scripts/cupboard.ts add API_KEY -s api -s workers
bun scripts/cupboard.ts add --from-root
```

### `list [service]`

List shared variables.

**Examples:**
```bash
bun scripts/cupboard.ts list          # All shared variables
bun scripts/cupboard.ts list api      # Variables shared with api service
```

### `remove <VAR> [options]`

Remove a shared variable.

**Options:**
- `-s, --service <name>`: Remove from specific service(s) only

**Examples:**
```bash
bun scripts/cupboard.ts remove JWT_SECRET              # Remove entirely
bun scripts/cupboard.ts remove JWT_SECRET -s rocco    # Remove from rocco only
```

### `export railway`

Export shared variables to Railway.

- Sets variables at Railway project level
- Each service that has the variable in its `services` list will have access
- Uses `--skip-deploys` flag to avoid triggering deployments

### `export local`

Export shared variables to local `.env.production` files.

- Generates `.env.production` files for each service
- Merges shared variables with service-specific variables
- Shared variables take precedence over existing service-specific values

## Data Storage

### `.cupboard/keys.json`

The source of truth for shared environment variables:

```json
{
  "keys": [
    {
      "name": "DATABASE_URL",
      "value": "postgresql://user:pass@host/db",
      "services": ["api", "workers", "db"]
    },
    {
      "name": "JWT_SECRET",
      "value": "super-secret",
      "services": ["api", "rocco"]
    }
  ]
}
```

### Service-Specific Variables

Each service maintains its own `.env.production` file. When you run `export local`, Cupboard:

1. Reads the existing `.env.production` file for the service
2. Collects all shared variables that the service has access to
3. Merges them (shared variables take precedence)
4. Writes the merged file

## Workflow

### Adding a New Variable

1. Add to cupboard:
   ```bash
   bun scripts/cupboard.ts add MY_NEW_VAR
   ```

2. Export to local files (for local development):
   ```bash
   bun scripts/cupboard.ts export local
   ```

3. Export to Railway (for production):
   ```bash
   bun scripts/cupboard.ts export railway
   ```

### Bulk Import

If you have an existing `.env.production` file with many variables:

```bash
bun scripts/cupboard.ts add --from-root
```

This will:
- Show you each variable
- Ask if you want to add it
- Prompt for which services should have access

## Services

The following services are configured:

| Service | Local File | Railway Service |
|---------|-----------|-----------------|
| api | `services/api/.env.production` | `hominem-api` |
| workers | `services/workers/.env.production` | `workers` |
| db | `packages/db/.env.production` | `hominem-db` |
| florin | `apps/rocco/.env.production` | `Florin` |
| rocco | `apps/rocco/.env.production` | `Rocco` |
| notes | `apps/notes/.env.production` | `Notes` |

## Tips

1. **Always export local first** to test changes before pushing to Railway
2. **Use `--from-root` sparingly** - it's better to add variables one at a time
3. **Check with `list`** before removing to see which services will be affected
4. **Railway sync** sets variables at the project level, so services share them via reference

## Troubleshooting

### "Service not found"
Make sure the service name matches exactly (case-sensitive).

### Changes not reflected
Remember to run `export local` or `export railway` after adding/removing variables.

### Railway authentication
Make sure you're logged in:
```bash
railway login
railway link  # Link to the hominem project
```
