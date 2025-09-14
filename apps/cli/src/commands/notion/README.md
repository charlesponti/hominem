# Notion CLI Tool

This tool allows you to pull data from Notion databases using the Notion API.

## Setup

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "Hominem CLI")
4. Select the workspace where your database is located
5. Click "Submit"
6. Copy the "Internal Integration Token" (starts with `secret_`)

### 2. Share Database with Integration

1. Open your Notion database
2. Click the "Share" button in the top right
3. Click "Invite" and search for your integration name
4. Click "Invite" to grant access

### 3. Get Database ID

1. Open your Notion database in a web browser
2. The database ID is in the URL: `https://notion.so/[workspace]/[database-id]?v=[view-id]`
3. The database ID is the 32-character string between the workspace and the `?v=`

### 4. Set Environment Variables

Create a `.env` file in your project root or export the variables:

```bash
export NOTION_TOKEN="secret_your_integration_token_here"
export NOTION_DATABASE_ID="your_database_id_here"
```

## Usage

### Pull Data (Read-Only)

```bash
hominem notion pull
```

This will fetch up to 100 records from your database and display them in a table format.

### Sync Data (Import to Hominem)

```bash
hominem notion sync
```

This will fetch data from Notion and sync it with the hominem API, creating content items that you can manage through the hominem ecosystem.

**Note**: The sync command requires authentication with the hominem API. Run `hominem auth` first to authenticate.

### Pull Options

- `-l, --limit <number>`: Maximum number of results to fetch (1-100, default: 100)
- `-c, --cursor <string>`: Pagination cursor for next page
- `-f, --filter <string>`: Filter query (JSON string)
- `-s, --sort <string>`: Sort query (JSON string)
- `-o, --output <format>`: Output format: table, json, csv (default: table)
- `--output-file <file>`: Output file path (optional)

### Sync Options

- `-l, --limit <number>`: Maximum number of results to fetch (1-100, default: 100)
- `-c, --cursor <string>`: Pagination cursor for next page
- `-f, --filter <string>`: Filter query (JSON string)
- `-s, --sort <string>`: Sort query (JSON string)
- `--dry-run`: Show what would be synced without actually syncing
- `--batch-size <number>`: Number of items to process in each batch (1-50, default: 10)
- `--content-type <type>`: Content type to create: note, task, document (default: note)
- `--tag-prefix <prefix>`: Prefix for auto-generated tags (default: notion)

### Examples

#### Pull Data Examples

##### Display results in a table
```bash
hominem notion pull
```

##### Export to JSON file
```bash
hominem notion pull --output json --output-file data.json
```

##### Export to CSV file
```bash
hominem notion pull --output csv --output-file data.csv
```

##### Filter results
```bash
hominem notion pull --filter '{"property": "Status", "select": {"equals": "Done"}}'
```

##### Sort results
```bash
hominem notion pull --sort '[{"property": "Created", "direction": "descending"}]'
```

##### Limit results
```bash
hominem notion pull --limit 50
```

##### Pagination
```bash
# First page
hominem notion pull --limit 10

# Next page (use the cursor from the previous command)
hominem notion pull --limit 10 --cursor "your_cursor_here"
```

#### Sync Data Examples

##### Basic sync
```bash
hominem notion sync
```

##### Dry run to see what would be synced
```bash
hominem notion sync --dry-run
```

##### Sync as tasks instead of notes
```bash
hominem notion sync --content-type task
```

##### Sync with custom tag prefix
```bash
hominem notion sync --tag-prefix "work"
```

##### Sync with filtering
```bash
hominem notion sync --filter '{"property": "Status", "select": {"equals": "Done"}}'
```

##### Sync in smaller batches
```bash
hominem notion sync --batch-size 5
```

### Filter Examples

Filter by text property:
```bash
hominem notion pull --filter '{"property": "Name", "title": {"contains": "Important"}}'
```

Filter by select property:
```bash
hominem notion pull --filter '{"property": "Status", "select": {"equals": "In Progress"}}'
```

Filter by number property:
```bash
hominem notion pull --filter '{"property": "Priority", "number": {"greater_than": 5}}'
```

Filter by date property:
```bash
hominem notion pull --filter '{"property": "Due Date", "date": {"after": "2024-01-01"}}'
```

Filter by checkbox property:
```bash
hominem notion pull --filter '{"property": "Completed", "checkbox": {"equals": true}}'
```

### Sort Examples

Sort by property ascending:
```bash
hominem notion pull --sort '[{"property": "Name", "direction": "ascending"}]'
```

Sort by property descending:
```bash
hominem notion pull --sort '[{"property": "Created", "direction": "descending"}]'
```

Multiple sorts:
```bash
hominem notion pull --sort '[{"property": "Status", "direction": "ascending"}, {"property": "Priority", "direction": "descending"}]'
```

## Output Formats

### Table Format (Default)
Displays results in a formatted table with columns for ID, Created, Last Edited, and all database properties.

### JSON Format
Returns raw JSON data from the Notion API, useful for further processing.

### CSV Format
Exports data as CSV with proper escaping and formatting.

## Error Handling

The tool provides helpful error messages for common issues:

- Missing environment variables
- Invalid database ID
- Authentication errors
- API rate limits
- Invalid filter/sort syntax

## Rate Limits

Notion API has rate limits:
- 3 requests per second
- 1000 requests per 10 seconds

The tool respects these limits and will show appropriate error messages if limits are exceeded.
