# @hominem/finance

Financial services and transaction management.

## Installation

```bash
bun add @hominem/finance
```

## Usage

```typescript
import { financeService, getTransactionsInputSchema } from '@hominem/finance-services'

// Use finance services
const transactions = await financeService.getTransactions({ userId: 'user-id' })
```
