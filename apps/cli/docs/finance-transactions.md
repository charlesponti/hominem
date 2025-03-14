# Finance Transaction Processing Documentation

## Overview

The Finance Transaction Processing system is designed to import, organize, normalize, and analyze financial transaction data from various sources. It handles transaction deduplication, account identification, categorization, and provides tools for querying and analyzing your financial data.

## Table of Contents

- [Getting Started](#getting-started)
- [Data Import](#data-import)
- [Data Model](#data-model)
- [Name Management](#name-management)
- [Deduplication Strategy](#deduplication-strategy)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Getting Started

### Installation

The finance transaction processing system is part of the Hominem CLI. You can access it once the CLI is installed:

```bash
bun install
```

### Basic Usage

Import and process transaction data from CSV files:

```bash
hominem finance transactions build /path/to/transactions/directory
```

Query transactions:

```bash
hominem finance transactions query --from 2024-01-01 --to 2024-03-31
```

View transaction analytics:

```bash
hominem finance transactions analyze --by category
```

## Data Import

### Supported Input Formats

The system currently supports CSV files with the following expected format:

| Field          | Description                           | Example              |
|----------------|---------------------------------------|----------------------|
| date           | Transaction date (YYYY-MM-DD)         | 2024-04-02          |
| name           | Transaction description/merchant name | Spotify Subscription |
| amount         | Transaction amount (decimal)          | -12.99              |
| status         | Transaction status                    | posted              |
| category       | Transaction category                  | Entertainment       |
| parent_category| Parent category if applicable         | Services            |
| excluded       | Whether to exclude from reports       | false               |
| type           | Transaction type                      | regular             |
| account        | Account name                          | Capital One Checking |
| account_mask   | Last digits of account number         | 9015                |
| note           | Optional notes                        | Monthly subscription|
| recurring      | Recurring identifier                  | Spotify             |

### Filename Convention

CSV files are expected to follow this naming pattern for optimal chronological processing:

```
transactions-YYYY-MM-DD.csv
```

Where the date represents when the transactions were exported.

### Processing Workflow

1. CSV files are loaded in chronological order
2. Each transaction is parsed and validated
3. Transactions are fingerprinted for deduplication
4. New transactions are inserted into the database
5. Similar transactions are merged to handle name variations
6. Account information is associated with transactions
7. Import statistics are generated (processed, skipped, merged)

## Data Model

The transaction processing system uses the following data model:

### Transactions Table

Primary transaction information:

- `id`: Unique identifier
- `date`: Transaction date
- `name`: Original merchant/transaction name
- `amount`: Transaction amount
- `status`: Processing status
- `category`: Transaction category
- `parentCategory`: Parent category
- `excluded`: Flag for exclusion from reports
- `tags`: Optional tags
- `type`: Transaction type
- `account`: Account name
- `accountMask`: Last digits of account number
- `note`: Optional notes
- `recurring`: Recurring identifier
- Timestamps: `createdAt`, `updatedAt`

### Accounts Table

Normalized account information:

- `id`: Unique identifier
- `name`: Normalized account name
- `mask`: Last digits of account number
- `type`: Account type (checking, savings, credit)
- `institution`: Financial institution
- `isActive`: Whether the account is active
- Timestamps: `createdAt`, `updatedAt`

### TransactionAccounts Table

Maps transactions to accounts (many-to-many):

- `transactionId`: Reference to a transaction
- `accountId`: Reference to an account
- `accountName`: Original account name (for historical reference)
- `accountMask`: Original account mask (for historical reference)

### TransactionNames Table

Tracks multiple names for the same transaction:

- `transactionId`: Reference to a transaction
- `name`: Alternative transaction name

## Name Management

### Account Name Management

Account names can vary due to:

1. Typos in exports (e.g., "Captial One" vs "Capital One")
2. Abbreviations (e.g., "Cap1" vs "Capital One")
3. Different formatting from different sources
4. Institution rebranding

The system handles these variations through:

- Account normalization during import
- Fixing account name typos using the `fix-account-names` command
- Maintaining relationships between transactions and accounts
- Preserving original names for auditing purposes

#### Managing Account Name Changes

To fix account name issues:

```bash
hominem finance transactions fix-account-names
```

This command:
1. Identifies common typos and variations
2. Corrects them in the database
3. Updates all related references
4. Merges duplicate accounts that refer to the same actual account

To update an account's details:

```bash
hominem finance transactions accounts update <id> --name "New Name" --type "Checking" --institution "Capital One"
```

### Transaction Name Management

Transaction names often change for the same recurring transaction:

1. Different formatting from the merchant
2. Additional reference codes
3. Location information added/removed
4. Name changes due to business acquisitions

The system handles transaction name variations through:

- Storing multiple names for the same transaction
- Using the `transactionNames` table to track all observed names
- Applying similarity checks during deduplication
- Maintaining the original name for reference

## Deduplication Strategy

The system uses a multi-faceted approach to identify duplicate transactions:

1. **Transaction Fingerprinting**: Generating a unique hash based on:
   - Date
   - Amount
   - Transaction type
   - Merchant name
   - Recurring flag

2. **Similarity Checks**: If a potential duplicate is found, additional checks:
   - Exact name match
   - Substring matching (one name contains the other)
   - Normalized name comparison (removing special characters)

3. **Time-based Thresholds**: Option to consider transactions within a specific timeframe as duplicates

### Deduplication Parameters

- `--deduplicate-threshold <minutes>`: Time threshold to consider transactions as duplicates (default: 60)

## Usage Examples

### Import Transactions

```bash
hominem finance transactions build /path/to/csv/files --deduplicate-threshold 120
```

### Query Transactions

```bash
# Basic query with date range
hominem finance transactions query --from 2024-01-01 --to 2024-03-31

# Filter by category
hominem finance transactions query --category "Food & Drink"

# Filter by amount range
hominem finance transactions query --min 100 --max 500

# Filter by account
hominem finance transactions query --account "Capital One Quicksilver"

# Full text search
hominem finance transactions query --search "amazon"

# Export results to JSON
hominem finance transactions query --from 2024-01-01 --json > transactions.json
```

### Analyze Transactions

```bash
# Analyze by category
hominem finance transactions analyze --by category

# Analyze by month
hominem finance transactions analyze --by month --from 2024-01-01 --to 2024-12-31

# Analyze by merchant
hominem finance transactions analyze --by merchant --top 20

# Analyze by account
hominem finance transactions analyze --by account
```

### Manage Accounts

```bash
# List all accounts
hominem finance transactions accounts list

# List only active accounts
hominem finance transactions accounts list --active-only

# Update account information
hominem finance transactions accounts update 1 --name "Capital One 360 Checking" --type "Checking" --institution "Capital One"

# Deactivate an account
hominem finance transactions accounts update 2 --deactivate
```

### Fix Data Issues

```bash
# Fix account name typos and merge duplicates
hominem finance transactions fix-account-names

# Clean up database (remove orphaned records)
hominem finance transactions cleanup
```

## Best Practices

### Data Import

1. **Consistent Naming**: Use the same naming convention for your exports
2. **Chronological Order**: Process files in chronological order
3. **Regular Imports**: Import data regularly to maintain a complete history
4. **Source Consistency**: Use the same source for each account when possible

### Data Maintenance

1. **Fix Account Names**: Run the `fix-account-names` command after bulk imports
2. **Regular Cleanup**: Run the `cleanup` command periodically
3. **Verify Imports**: Check import statistics for unexpected duplicate counts
4. **Audit Periodically**: Compare database totals with account statements

### Analysis

1. **Use Date Ranges**: Always specify date ranges for consistent reporting
2. **Category Consistency**: Maintain consistent categories for accurate reporting
3. **Account Reconciliation**: Compare totals by account with your financial institution

## Troubleshooting

### Common Issues

#### Import Errors

- **"Datatype mismatch"**: Check that the CSV format matches expected structure
- **"Transaction file not found"**: Verify file paths and permissions
- **"Unexpected duplicate count"**: May indicate changed transaction names or duplicate imports

#### Query Issues

- **"No transactions found"**: Check date range and filters
- **"Incorrect totals"**: Verify category assignments and excluded transactions

### Resolving Name Conflicts

If you encounter issues with account or transaction names:

1. Use the `fix-account-names` command to correct common typos
2. For custom corrections, use SQL directly or the `accounts update` command
3. For persistent issues, check your data source for consistency

## API Reference

The transaction system is available via API endpoints when running the Hominem server:

```bash
hominem serve
```

### API Endpoints

All endpoints are accessible via the tRPC protocol:

- **GET /trpc/finance.getAccounts**: List accounts
- **GET /trpc/finance.queryTransactions**: Query transactions
- **GET /trpc/finance.analyzeTransactions**: Analyze transactions by dimension
- **GET /trpc/finance.getTransactionById**: Get transaction details
- **GET /trpc/finance.getFinanceSummary**: Get financial summary
- **POST /trpc/finance.updateAccount**: Update account information
- **POST /trpc/finance.importTransactions**: Import transactions from a CSV file

#### Import Transactions API

The import transactions endpoint allows uploading CSV files via API:

**Endpoint**: `/trpc/finance.importTransactions`  
**Method**: POST  
**Parameters**:

- `csvFile`: Base64-encoded CSV file content
- `fileName`: Original file name (optional)
- `fileDate`: Date for the file in YYYY-MM-DD format (optional, defaults to current date)
- `deduplicateThreshold`: Time threshold in minutes to consider transactions as duplicates (optional, default: 60)

**Response**:

```json
{
  "success": true,
  "originalFileName": "bank-export.csv",
  "processedFileName": "transactions-2024-03-15.csv",
  "fileDate": "2024-03-15",
  "processed": 120,
  "skipped": 5,
  "merged": 3,
  "total": 125,
  "newTransactions": 120,
  "duplicatesSkipped": 5,
  "mergedNames": 3,
  "deduplicationPercentage": 4,
  "timestamp": "2024-03-15T12:34:56.789Z"
}
```

**Example Usage**:

```javascript
// Browser example
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const reader = new FileReader();

reader.onload = async (e) => {
  const base64Content = e.target.result.split(',')[1]; // Remove data URL prefix
  
  const response = await fetch('/api/trpc/finance.importTransactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csvFile: base64Content,
      fileName: file.name,
      fileDate: '2024-03-15', // Optional: specify the date 
      deduplicateThreshold: 60
    }),
  });
  
  const result = await response.json();
  console.log(result);
};

reader.readAsDataURL(file);
```

### Client API

Interact with the API using the built-in client:

```bash
# Check accounts
hominem api finance accounts

# Query transactions
hominem api finance transactions --from 2024-01-01

# Analyze data
hominem api finance analyze --dimension category

# Get summary stats
hominem api finance summary

# Import transactions from a CSV file
hominem api finance import /path/to/transactions.csv --date 2024-03-15
```

#### Import API Client Usage

```bash
# Basic usage with auto date detection
hominem api finance import ./march-transactions.csv

# Specify explicit date
hominem api finance import ./bank-export.csv --date 2024-03-15

# Adjust the deduplication threshold
hominem api finance import ./transactions.csv --deduplicate-threshold 120
```