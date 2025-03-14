import csvParser from 'csv-parser'
import { and, eq, isNull, or } from 'drizzle-orm'
import fs from 'fs-extra'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { db } from '../../db'
import {
  accounts,
  transactionAccounts,
  transactionNames,
  transactions,
  type Transaction,
} from '../../db/schema'
import logger from './logger'

export type TransactionInsert = typeof transactions.$inferInsert
export type ProcessingStats = { processed: number; skipped: number; merged: number }

// Export for testing
export function isSimilarTransaction(tx1: TransactionInsert, tx2: TransactionInsert): boolean {
  // Check if date, amount, and type match
  if (tx1.date !== tx2.date || tx1.amount !== tx2.amount || tx1.type !== tx2.type) {
    return false
  }

  // Check for name similarity - exact match or substring
  if (tx1.name === tx2.name) {
    return true
  }

  // Check if one name contains the other (for shortened/extended names)
  if (tx1.name.includes(tx2.name) || tx2.name.includes(tx1.name)) {
    return true
  }

  // Check if names are similar using basic string similarity
  const name1 = tx1.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const name2 = tx2.name.toLowerCase().replace(/[^a-z0-9]/g, '')

  // If one name is contained within the other after normalization
  if (name1.includes(name2) || name2.includes(name1)) {
    return true
  }

  return false
}

// Export for testing
export async function findTransactionFiles(directory: string): Promise<string[]> {
  logger.info(`Scanning directory: ${directory}`)
  const files = await fs.readdir(directory)
  const csvFiles = files
    .filter((file) => file.endsWith('.csv') && file.startsWith('transactions-'))
    .sort() // Process files in chronological order

  logger.info(`Found ${csvFiles.length} CSV files to process`)
  return csvFiles
}

// Export for testing
export async function parseTransactionFile(filePath: string): Promise<TransactionInsert[]> {
  logger.info(`Parsing file: ${filePath}`)
  return new Promise((resolve, reject) => {
    const results: TransactionInsert[] = []

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        try {
          // Clean the amount field - remove quotes and other non-numeric chars except decimal point
          const cleanAmount = data.amount.toString().replace(/[^0-9.-]/g, '')

          const tx: TransactionInsert = {
            date: data.date,
            name: data.name,
            amount: Number.parseFloat(cleanAmount),
            status: data.status,
            category: data.category,
            parentCategory: data['parent category'] || data.parent_category || null,
            excluded: data.excluded === 'true' || data.excluded === true,
            tags: data.tags,
            type: data.type,
            account: data.account,
            accountMask: data['account mask'] || data.account_mask || '',
            note: data.note,
            recurring: data.recurring,
          }

          // Validate that amount is a valid number
          if (Number.isNaN(tx.amount)) {
            logger.warn(`Invalid amount in row: ${JSON.stringify(data)}`)
            return // Skip this row
          }

          results.push(tx)
        } catch (err) {
          logger.error(`Error processing row: ${JSON.stringify(data)}`, err)
          // Continue processing other rows
        }
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err))
  })
}

// Export for testing
export async function findExistingTransaction(tx: TransactionInsert) {
  // Strict matching for duplicate transactions:
  // - Same date (exact, no tolerance)
  // - Same amount (exact, no tolerance)
  // - Same transaction type
  // - Same account
  const record = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.date, tx.date),
      eq(transactions.amount, tx.amount),
      eq(transactions.type, tx.type),
      eq(transactions.account, tx.account)
    ),
  })

  return record || null
}

// Export for testing
export async function getOrCreateAccount(accountName: string, accountMask: string | null) {
  // Check if the account exists
  const existingAccount = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.name, accountName),
        or(isNull(accounts.mask), accountMask ? eq(accounts.mask, accountMask) : undefined)
      )
    )
    .limit(1)

  if (existingAccount.length > 0) {
    // Use existing account
    return existingAccount[0].id
  }

  // Create new account
  const insertedAccount = await db
    .insert(accounts)
    .values({
      name: accountName,
      mask: accountMask,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning({ insertedId: accounts.id })

  return insertedAccount[0].insertedId
}

// Export for testing
export async function linkAccountToTransaction(
  transactionId: number,
  tx: TransactionInsert
): Promise<boolean> {
  try {
    // Check if this account is already associated with the transaction
    const accountExists = await db.query.transactionAccounts.findFirst({
      where: and(
        eq(transactionAccounts.transactionId, transactionId),
        eq(transactionAccounts.accountName, tx.account)
      ),
    })

    if (accountExists) {
      return false // Already linked
    }

    // Get or create the account
    const accountId = await getOrCreateAccount(tx.account, tx.accountMask || null)

    // Add the account to the existing transaction
    await db.insert(transactionAccounts).values({
      transactionId,
      accountId,
      accountName: tx.account,
      accountMask: tx.accountMask || null,
    })

    return true
  } catch (error) {
    logger.error(
      `Error adding account to transaction: ${JSON.stringify({ id: transactionId, account: tx.account })}`,
      error
    )
    return false
  }
}

// Export for testing
export async function linkNameToTransaction(transactionId: number, name: string): Promise<boolean> {
  try {
    // Check if this name is already associated with the transaction
    const nameExists = await db.query.transactionNames.findFirst({
      where: and(
        eq(transactionNames.transactionId, transactionId),
        eq(transactionNames.name, name)
      ),
    })

    if (nameExists) {
      return false // Already linked
    }

    // Add the name to the existing transaction
    await db.insert(transactionNames).values({
      transactionId,
      name,
    })

    return true
  } catch (error) {
    logger.error(
      `Error adding name to transaction: ${JSON.stringify({ id: transactionId, name })}`,
      error
    )
    return false
  }
}

// Export for testing
export async function handleDuplicate(
  tx: TransactionInsert,
  existingTx: Transaction
): Promise<boolean> {
  let merged = false

  // Update transaction metadata if needed
  await updateTransactionIfNeeded(tx, existingTx)

  // Link account if needed
  const accountLinked = await linkAccountToTransaction(existingTx.id, tx)
  if (accountLinked) {
    logger.debug(`Linked account ${tx.account} to existing transaction ${existingTx.id}`)
  }

  // Link name if needed
  const nameLinked = await linkNameToTransaction(existingTx.id, tx.name)
  if (nameLinked) {
    merged = true
    logger.debug(`Linked name "${tx.name}" to existing transaction ${existingTx.id}`)
  }

  return merged
}

// Export for testing
export async function updateTransactionIfNeeded(
  tx: TransactionInsert,
  existingTx: Transaction
): Promise<boolean> {
  const updates: Partial<TransactionInsert> = {}
  let needsUpdate = false

  // Only update empty or null fields if the new transaction has data
  if ((!existingTx.category || existingTx.category === '') && tx.category) {
    updates.category = tx.category
    needsUpdate = true
  }

  if ((!existingTx.parentCategory || existingTx.parentCategory === '') && tx.parentCategory) {
    updates.parentCategory = tx.parentCategory
    needsUpdate = true
  }

  if (!existingTx.note && tx.note) {
    updates.note = tx.note
    needsUpdate = true
  }

  if (!existingTx.tags && tx.tags) {
    updates.tags = tx.tags
    needsUpdate = true
  }

  if (needsUpdate) {
    try {
      updates.updatedAt = new Date().toISOString()
      await db.update(transactions).set(updates).where(eq(transactions.id, existingTx.id))
      logger.debug(`Updated transaction ${existingTx.id} with additional metadata`)
      return true
    } catch (error) {
      logger.error(`Failed to update transaction ${existingTx.id}:`, error)
      return false
    }
  }

  return false
}

// Export for testing
export async function createNewTransaction(tx: TransactionInsert): Promise<boolean> {
  try {
    // Generate a truly unique ID using a combination of transaction properties and timestamp
    const uniqueIdBase = `${tx.date}_${tx.name}_${tx.amount}_${tx.account}_${Date.now()}_${Math.random()}`
    const uniqueId = Number.parseInt(
      createHash('md5').update(uniqueIdBase).digest('hex').substring(0, 8),
      16
    )

    const result = await db
      .insert(transactions)
      .values({
        id: uniqueId, // Use hash-based ID to ensure uniqueness
        date: tx.date,
        name: tx.name,
        amount: tx.amount,
        status: tx.status,
        category: tx.category || '', // use empty string instead of null for NOT NULL fields
        parentCategory: tx.parentCategory || '', // use empty string instead of null for NOT NULL fields
        excluded: tx.excluded,
        tags: tx.tags || null,
        type: tx.type,
        account: tx.account,
        accountMask: tx.accountMask || null,
        note: tx.note || null,
        recurring: tx.recurring || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning({ insertedId: transactions.id })

    // Get the auto-generated ID
    const insertedId = result[0]?.insertedId

    if (!insertedId) {
      throw new Error('Failed to get inserted transaction ID')
    }

    // Insert initial name
    await db.insert(transactionNames).values({
      transactionId: insertedId,
      name: tx.name,
    })

    // Get or create account and link it
    const accountId = await getOrCreateAccount(tx.account, tx.accountMask || null)

    // Insert transaction-account relationship
    await db.insert(transactionAccounts).values({
      transactionId: insertedId,
      accountId,
      accountName: tx.account,
      accountMask: tx.accountMask || null,
    })

    return true
  } catch (error) {
    logger.error(`Error inserting transaction: ${JSON.stringify(tx)}`, error)
    throw new Error(
      `Failed to insert transaction: ${error instanceof Error ? error.message : error}`
    )
  }
}

// Export for testing
export async function processTransaction(tx: TransactionInsert): Promise<{
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: TransactionInsert
}> {
  try {
    // Check if transaction already exists
    const existingTransaction = await findExistingTransaction(tx)

    if (existingTransaction) {
      // Handle duplicate transaction
      const merged = await handleDuplicate(tx, existingTransaction)

      // Return more specific action status
      if (merged) {
        return { action: 'merged', transaction: tx }
      }

      // Check if we updated the transaction metadata
      const updated = await updateTransactionIfNeeded(tx, existingTransaction)
      return { action: updated ? 'updated' : 'skipped', transaction: tx }
    }

    // Insert as new transaction
    await createNewTransaction(tx)
    return { action: 'created', transaction: tx }
  } catch (error) {
    logger.error(
      `Error processing transaction: ${tx.date} ${tx.account} ${tx.name} ${tx.amount}`,
      error
    )
    throw new Error(
      `Failed to process transaction: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// Export for testing
export async function* processTransactionsFromFile(filePath: string): AsyncGenerator<{
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: TransactionInsert
}> {
  const transactions = await parseTransactionFile(filePath)
  let processed = 0

  // Process in batches of 10 for better performance while avoiding DB overload
  const batchSize = 10
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)

    // Process batch concurrently
    const results = await Promise.allSettled(batch.map((tx) => processTransaction(tx)))

    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed++
        yield result.value
      } else {
        logger.error('Failed to process transaction', result.reason)
      }
    }

    // Add a small delay between batches to avoid overloading the database
    if (i + batchSize < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  logger.info(
    `Processed ${processed}/${transactions.length} transactions from file ${path.basename(filePath)}`
  )
}

// Process CSV files and build database
export async function* processTransactions(
  directory: string,
  deduplicateThreshold = 60
): AsyncGenerator<{
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: TransactionInsert
  file: string
}> {
  logger.info(
    JSON.stringify(
      { msg: 'Starting transaction processing', directory, deduplicateThreshold },
      null,
      2
    )
  )

  const csvFiles = await findTransactionFiles(directory)

  // Process each CSV file
  for (const file of csvFiles) {
    const filePath = path.join(directory, file)
    logger.info(`Processing file: ${file}`)

    try {
      // Stream results from each file
      for await (const result of processTransactionsFromFile(filePath)) {
        yield { ...result, file }
      }
    } catch (error) {
      logger.error(`Error processing file ${file}:`, error)
    }
  }

  logger.info({ msg: 'Processing completed' })
}
