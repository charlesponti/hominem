# Hominem CLI

Command line tools for various tasks.

## Installation

```bash
bun install
```

## API Server

Hominem includes a powerful API server built with Hono.js and tRPC, providing a set of tools for various tasks.

### Starting the Server

To start the API server:

```bash
hominem serve [options]
```

Options:
- `-p, --port <port>` - Port to run the server on (default: 4445)
- `-h, --host <host>` - Host to run the server on (default: localhost)
- `--email-domain <domain>` - Email domain for masked emails (default: myapp.example.com)

### API Client

The CLI also includes a client to interact with the API server:

```bash
hominem api <command> [options]
```

Available commands:

- `health` - Check API server health
  ```bash
  hominem api health [--host <host>] [--port <port>]
  ```

- `notes` - List all notes
  ```bash
  hominem api notes [--host <host>] [--port <port>]
  ```

- `create-note` - Create a new note
  ```bash
  hominem api create-note [--host <host>] [--port <port>] [--content <content>]
  ```

- `generate-email` - Generate a masked email
  ```bash
  hominem api generate-email [--host <host>] [--port <port>] [--user-id <userId>]
  ```

### Available Endpoints

- `/` - API information
- `/health` - Health check endpoint
- `/trpc/*` - tRPC endpoints for notes, email masking, and finance

#### tRPC Endpoints

##### Notes
- `notes.list` - List all notes
- `notes.create` - Create a new note
- `notes.update` - Update an existing note
- `notes.delete` - Delete a note

##### Email
- `email.generateEmail` - Generate a masked email
- `email.deactivateEmail` - Deactivate a masked email
- `email.getEmailById` - Get email by ID
- `email.getEmailsByUserId` - Get emails by user ID

##### Finance
- `finance.getAccounts` - Get list of financial accounts
- `finance.updateAccount` - Update account information
- `finance.queryTransactions` - Query transactions with filters
- `finance.analyzeTransactions` - Analyze transactions by dimension
- `finance.getTransactionById` - Get details of a specific transaction
- `finance.getFinanceSummary` - Get financial summary statistics

### Finance API Client

The CLI provides commands to interact with the finance endpoints:

```bash
hominem api finance <command> [options]
```

Available commands:

- `accounts` - List financial accounts
  ```bash
  hominem api finance accounts [--host <host>] [--port <port>] [--active-only] [--json]
  ```

- `transactions` - Query transaction data
  ```bash
  hominem api finance transactions [--host <host>] [--port <port>] [--from <date>] [--to <date>] [--category <category>] [--search <text>] [--min <amount>] [--max <amount>] [--account <name>] [--limit <n>] [--json]
  ```

- `analyze` - Analyze transaction data
  ```bash
  hominem api finance analyze [--host <host>] [--port <port>] [--from <date>] [--to <date>] [--dimension <dim>] [--top <n>] [--json]
  ```
  
  The `dimension` parameter can be one of: `category`, `month`, `merchant`, or `account`.

- `summary` - Get financial summary
  ```bash
  hominem api finance summary [--host <host>] [--port <port>] [--from <date>] [--to <date>] [--json]
  ```

## Finance Tools

### Transactions

Advanced transaction processing and analysis tools:

```bash
# Process and build transaction database from CSV files
hominem finance transactions build <directory> [options]

# Query transactions with filtering
hominem finance transactions query [options]

# Analyze spending patterns
hominem finance transactions analyze --by category
hominem finance transactions analyze --by month
hominem finance transactions analyze --by merchant

# Export transactions to CSV
hominem finance transactions export [options]
```

#### Transaction Build Options

- `--deduplicate-threshold <minutes>`: Time threshold for considering duplicate transactions

#### Transaction Query Options

- `--from <date>`: Start date (YYYY-MM-DD)
- `--to <date>`: End date (YYYY-MM-DD)
- `--category <category>`: Filter by category
- `--min <amount>`: Minimum transaction amount
- `--max <amount>`: Maximum transaction amount
- `--account <account>`: Filter by account name
- `--limit <number>`: Limit results (default: 100)
- `--json`: Output as JSON instead of table

#### Transaction Analysis Options

- `--from <date>`: Start date (YYYY-MM-DD)
- `--to <date>`: End date (YYYY-MM-DD)
- `--by <dimension>`: Analysis dimension (category, month, merchant)
- `--format <format>`: Output format (table, json)
- `--top <number>`: Show top N results

#### Transaction Export Options

- `-o, --output <file>`: Output CSV file
- `--from <date>`: Start date (YYYY-MM-DD)
- `--to <date>`: End date (YYYY-MM-DD)
- `--category <category>`: Filter by category