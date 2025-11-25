# Hominem MCP Server

A Model Context Protocol server providing AI-powered tools for health, fitness, finance, productivity, and more.

This TypeScript-based MCP server integrates with the Hominem ecosystem to provide LLM assistants with access to various tools and resources. The server communicates over stdio and can be used with Claude Desktop or other MCP-compatible clients.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

### Testing

Run tests:
```bash
npm test
```

**Note for CI/CD:** Some tests require a local LM Studio instance running at `http://localhost:1234/v1`. These tests will be automatically skipped in CI environments unless `LM_STUDIO_URL` is set to a valid endpoint.

## Installation

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "health-and-fitness": {
      "command": "/path/to/health-and-fitness/build/index.js"
    }
  }
}
```

### Authentication/configuration

The MCP server provides two types of tools:

- **Tools requiring authentication** - These access your personal data stored in the Hominem API (e.g., finance accounts, notes, transactions)
- **Tools without authentication** - These use AI models or external APIs to provide general functionality (e.g., workout recommendations, web scraping)

**Note:** The MCP server will start successfully even without authentication. Auth is only required when using tools that access your personal data. To see which tools require authentication, check each tool's documentation or try using it - you'll receive a clear error if authentication is needed.

#### Getting an Authentication Token

You can authenticate in three ways:

**Option 1: Using the CLI (Recommended)**
```bash
hominem auth
```
This will open your browser to get a token and automatically save it to `~/.hominem/config.json`.

**Option 2: Via Web App**
1. Visit http://localhost:4444/auth/cli in your browser
2. Log in with your credentials
3. Copy the displayed token
4. Create `~/.hominem/config.json` with:
```json
{ "token": "YOUR_SUPABASE_JWT_TOKEN" }
```

**Option 3: Manual Configuration**
If you already have a Supabase JWT token, create `~/.hominem/config.json`:
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

#### Configuration Options

**Path overrides:**
- `HOMINEM_CONFIG_DIR` - Change the base directory (default: `~/.hominem`)
- `HOMINEM_CONFIG_PATH` - Point directly to the config file path

**API endpoint overrides:**
- `HOMINEM_API_HOST` - Target a different API host (default: `localhost`)
- `HOMINEM_API_PORT` - Target a different API port (default: `4040`)

**LLM configuration:**
- `LM_STUDIO_URL` - Custom LM Studio or OpenAI-compatible endpoint (default: `http://localhost:1234/v1`)

#### Token Expiration and Renewal

Tokens expire based on your Supabase configuration. If you see authentication errors:

1. Re-authenticate using the CLI:
   ```bash
   hominem auth
   ```

2. Or manually update `~/.hominem/config.json` with a fresh token

#### Security Notes

- **No database credentials exposed**: The MCP server never accesses the database directly. All data operations go through the Hominem API.
- **Token stored locally**: Your authentication token is stored only on your machine at `~/.hominem/config.json`
- **API validates all requests**: The API validates your token with Supabase before processing any requests
- **User-specific data access**: You can only access your own data; the API enforces user-level isolation

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
