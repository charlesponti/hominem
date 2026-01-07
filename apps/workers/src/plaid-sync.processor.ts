import type { FinanceTransaction } from '@hominem/data/schema'
import { logger } from '@hominem/utils/logger'
import type { Job } from 'bullmq'
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { env } from './env'
import { PlaidService } from './plaid.service'

/**
 * Job data for Plaid sync jobs
 */
interface PlaidSyncJob {
  userId: string
  accessToken: string
  itemId: string
  initialSync: boolean
}

/**
 * Initialize Plaid client
 */
const configuration = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_API_KEY,
      'Content-Type': 'application/json',
    },
  },
})

const plaidClient = new PlaidApi(configuration)
const plaidService = new PlaidService()

/**
 * Process Plaid sync jobs
 * This fetches transaction and account data from Plaid and stores it in our database
 */
export async function processSyncJob(job: Job<PlaidSyncJob>) {
  const { userId, accessToken, itemId, initialSync } = job.data

  logger.info('Processing Plaid sync job', {
    message: 'Processing Plaid sync job',
    jobId: job.id,
    userId,
    itemId,
    initialSync,
  })

  try {
    // Get the Plaid item from database to make sure it exists and is valid
    const plaidItem = await plaidService.getPlaidItem(userId, itemId)

    if (!plaidItem) {
      throw new Error(`Plaid item ${itemId} not found for user ${userId}`)
    }

    // 1. Fetch and store accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    })

    for (const account of accountsResponse.data.accounts) {
      const accountData = {
        name: account.name,
        officialName: account.official_name || null,
        type: mapPlaidAccountType(account.type),
        subtype: account.subtype || null,
        mask: account.mask || null,
        balance: account.balances.current || 0,
        availableBalance: account.balances.available,
        limit: account.balances.limit,
        isoCurrencyCode: account.balances.iso_currency_code || 'USD',
        plaidAccountId: account.account_id,
        plaidItemId: plaidItem.id,
        institutionId: plaidItem.institutionId,
        lastUpdated: new Date(),
        userId,
      }

      await plaidService.upsertAccount(accountData)
    }

    // 2. Fetch and store transactions using transactions/sync endpoint
    let hasMore = true
    let cursor = plaidItem.transactionsCursor || null
    const batchSize = 500
    let totalTransactions = 0

    while (hasMore) {
      const transactionsResponse = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
        count: batchSize,
      })

      const added = transactionsResponse.data.added || []
      const modified = transactionsResponse.data.modified || []
      const removed = transactionsResponse.data.removed || []

      hasMore = transactionsResponse.data.has_more
      cursor = transactionsResponse.data.next_cursor

      // Process added transactions
      if (added.length > 0) {
        // Get all accounts for this user to map Plaid account IDs to our account IDs
        const userAccounts = await plaidService.getUserAccounts(userId, plaidItem.id)

        const accountMap = new Map(
          userAccounts.map((account) => [account.plaidAccountId, account.id])
        )

        for (const transaction of added) {
          // Skip if we can't map to one of our accounts
          if (!accountMap.has(transaction.account_id)) {
            logger.warn({
              message: 'Cannot find matching account for transaction',
              plaidAccountId: transaction.account_id,
              transactionId: transaction.transaction_id,
            })
            continue
          }

          const accountId = accountMap.get(transaction.account_id)

          // Check if transaction already exists
          const existingTransaction = await plaidService.getTransactionByPlaidId(
            transaction.transaction_id
          )

          if (existingTransaction) {
            // Skip - we already have this transaction
            continue
          }

          // Insert new transaction
          await plaidService.insertTransaction({
            type: determineTransactionType(transaction.amount) as FinanceTransaction['type'],
            amount: Math.abs(transaction.amount).toFixed(2),
            date: new Date(transaction.date),
            description: transaction.name,
            merchantName: transaction.merchant_name || null,
            accountId: accountId as string,
            category: transaction.category
              ? transaction.category[transaction.category.length - 1]
              : null,
            parentCategory:
              transaction.category && transaction.category.length > 1
                ? transaction.category[0]
                : null,
            pending: transaction.pending,
            paymentChannel: transaction.payment_channel,
            location: transaction.location,
            plaidTransactionId: transaction.transaction_id,
            userId,
          })
        }
      }

      // Process modified transactions
      if (modified.length > 0) {
        for (const transaction of modified) {
          // Get the existing transaction
          const existingTransaction = await plaidService.getTransactionByPlaidId(
            transaction.transaction_id
          )

          if (!existingTransaction) {
            // If the transaction doesn't exist yet (rare edge case), treat it as a new transaction
            // Find the account ID first
            const account = await plaidService.getAccountByPlaidId(transaction.account_id)

            if (!account) {
              logger.warn({
                message: 'Cannot find matching account for modified transaction',
                plaidAccountId: transaction.account_id,
                transactionId: transaction.transaction_id,
              })
              continue
            }

            // Insert the transaction
            await plaidService.insertTransaction({
              type: determineTransactionType(transaction.amount) as FinanceTransaction['type'],
              amount: Math.abs(transaction.amount).toFixed(2),
              date: new Date(transaction.date),
              description: transaction.name,
              merchantName: transaction.merchant_name || null,
              accountId: account.id,
              category: transaction.category
                ? transaction.category[transaction.category.length - 1]
                : null,
              parentCategory:
                transaction.category && transaction.category.length > 1
                  ? transaction.category[0]
                  : null,
              pending: transaction.pending,
              paymentChannel: transaction.payment_channel,
              location: transaction.location,
              plaidTransactionId: transaction.transaction_id,
              userId,
            })
          } else {
            // Update the existing transaction
            await plaidService.updateTransaction(existingTransaction.id, {
              type: determineTransactionType(transaction.amount) as FinanceTransaction['type'],
              amount: Math.abs(transaction.amount).toFixed(2),
              date: new Date(transaction.date),
              description: transaction.name,
              merchantName: transaction.merchant_name || null,
              category: transaction.category
                ? transaction.category[transaction.category.length - 1]
                : null,
              parentCategory:
                transaction.category && transaction.category.length > 1
                  ? transaction.category[0]
                  : null,
              pending: transaction.pending,
            })
          }
        }
      }

      // Process removed transactions
      if (removed.length > 0) {
        for (const removed_transaction of removed) {
          // Find the transaction to delete
          if (removed_transaction.transaction_id === undefined) {
            logger.warn({
              message: 'Removed transaction does not have a transaction_id',
              removedTransaction: removed_transaction,
            })
            continue
          }

          await plaidService.deleteTransaction(removed_transaction.transaction_id)
        }
      }

      // Update the cursor in database
      if (cursor) {
        await plaidService.updatePlaidItemCursor(plaidItem.id, cursor)
      }

      // Update counts
      totalTransactions += added.length + modified.length + removed.length

      // For large initial syncs, update progress
      if (initialSync && totalTransactions > 0 && totalTransactions % 1000 === 0) {
        logger.info(`Processed ${totalTransactions} transactions so far...`)
        await job.updateProgress(totalTransactions)
      }
    }

    // 3. Update the last synced timestamp for this Plaid item
    await plaidService.updatePlaidItemSyncStatus(plaidItem.id, 'active', null)

    logger.info({
      message: 'Completed Plaid sync job',
      jobId: job.id,
      userId,
      itemId,
      totalTransactions,
    })

    return {
      success: true,
      transactionsProcessed: totalTransactions,
    }
  } catch (error) {
    let plaidErrorDetail: unknown = null // Initialize with unknown type

    // Check if it's an AxiosError and try to get more details from Plaid's response
    // Safely access nested properties to avoid runtime errors
    if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as { response?: { data?: unknown } } // Type assertion
      plaidErrorDetail = axiosError.response?.data // Use optional chaining
    }

    logger.error({
      message: 'Error processing Plaid sync job',
      jobId: job.id,
      userId,
      itemId,
      error: error instanceof Error ? error.message : String(error),
      plaidError: plaidErrorDetail, // Add Plaid's specific error response
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Update item status on error
    await plaidService.updatePlaidItemError(
      itemId,
      error instanceof Error ? error.message : String(error)
    )

    throw error
  }
}

/**
 * Map Plaid account types to our schema's account types
 */
function mapPlaidAccountType(plaidType: string) {
  const typeMap: Record<string, string> = {
    depository: 'depository',
    credit: 'credit',
    loan: 'loan',
    investment: 'investment',
    brokerage: 'brokerage',
    other: 'other',
  }

  return typeMap[plaidType] || 'other'
}

/**
 * Determine transaction type based on amount
 * Plaid uses negative values for outflows, positive for inflows
 */
function determineTransactionType(amount: number) {
  if (amount < 0) {
    return 'expense'
  }
  return 'income'
}
