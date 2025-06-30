import { parse } from 'csv-parse'
import type { FinanceTransactionInsert } from '../../db/schema'
import { logger } from '../../logger'
import {
  convertCapitalOneTransaction,
  convertCopilotTransaction,
  type CapitalOneTransaction,
  type CopilotTransaction,
} from './bank-adapters'
import { processTransaction } from './transaction-processor'

export type ParsedTransactions = [string, Omit<FinanceTransactionInsert, 'accountId'>][]

// Configuration for processing
interface ProcessingConfig {
  batchSize: number
  batchDelay: number
  deduplicateThreshold: number
  maxRetries: number
  retryDelay: number
}

// Default processing configuration
const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  batchSize: 10,
  batchDelay: 100,
  deduplicateThreshold: 60,
  maxRetries: 3,
  retryDelay: 500,
}

/**
 * Parse transaction string (CSV) and convert to transaction objects
 */
export async function parseTransactionString(
  csvString: string,
  userId: string
): Promise<ParsedTransactions> {
  return new Promise((resolve, reject) => {
    const results: ParsedTransactions = []
    let isFirstRow = true
    let headers: string[] = []

    const parser = parse({
      delimiter: ',',
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    parser.on('readable', () => {
      let record: any
      while (true) {
        record = parser.read()
        if (record === null) break

        if (isFirstRow) {
          headers = Object.keys(record)
          isFirstRow = false
        }

        try {
          // Determine the bank format based on headers
          const bankFormat = detectBankFormat(headers)

          if (bankFormat === 'copilot') {
            const copilotTx = record as CopilotTransaction
            const accountName = copilotTx.account
            const convertedTx = convertCopilotTransaction(copilotTx, userId)
            results.push([accountName, convertedTx])
          } else if (bankFormat === 'capital-one') {
            const capitalOneTx = record as CapitalOneTransaction
            const accountName = `Capital One ${capitalOneTx['Account Number']}`
            const convertedTx = convertCapitalOneTransaction(capitalOneTx, '', userId)
            results.push([accountName, convertedTx])
          } else {
            logger.warn('Unknown bank format, skipping row:', record)
          }
        } catch (error) {
          logger.error('Error processing transaction row:', error, record)
          // Continue processing other rows
        }
      }
    })

    parser.on('error', (err) => {
      logger.error('Error parsing CSV:', err)
      reject(err)
    })

    parser.on('end', () => {
      logger.info(`Parsed ${results.length} transactions from CSV`)
      resolve(results)
    })

    parser.write(csvString)
    parser.end()
  })
}

/**
 * Detect bank format based on CSV headers
 */
function detectBankFormat(headers: string[]): 'copilot' | 'capital-one' | 'unknown' {
  const headerSet = new Set(headers.map((h) => h.toLowerCase()))

  // Copilot format detection
  if (
    headerSet.has('date') &&
    headerSet.has('name') &&
    headerSet.has('amount') &&
    headerSet.has('type')
  ) {
    return 'copilot'
  }

  // Capital One format detection
  if (
    headerSet.has('transaction date') &&
    headerSet.has('transaction amount') &&
    headerSet.has('transaction description')
  ) {
    return 'capital-one'
  }

  return 'unknown'
}

/**
 * Validate CSV format before processing
 */
export function validateCSVFormat(csvString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!csvString || csvString.trim().length === 0) {
    errors.push('CSV string is empty')
    return { isValid: false, errors }
  }

  const lines = csvString.split('\n')
  if (lines.length < 2) {
    errors.push('CSV must have at least a header row and one data row')
    return { isValid: false, errors }
  }

  const headerLine = lines[0]
  if (!headerLine) {
    errors.push('CSV header line is empty')
    return { isValid: false, errors }
  }

  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase())

  // Check for required headers based on detected format
  const format = detectBankFormat(headers)

  if (format === 'unknown') {
    errors.push('Unknown CSV format. Supported formats: Copilot, Capital One')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Process CSV file with validation and parsing
 */
export async function processCSVFile(
  csvString: string,
  userId: string,
  fileName: string
): Promise<{
  success: boolean
  transactions: ParsedTransactions
  errors: string[]
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
}> {
  const errors: string[] = []
  const stats = {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
  }

  try {
    // Validate CSV format
    const validation = validateCSVFormat(csvString)
    if (!validation.isValid) {
      return {
        success: false,
        transactions: [],
        errors: validation.errors,
        stats,
      }
    }

    // Parse transactions
    const transactions = await parseTransactionString(csvString, userId)

    stats.totalRows = csvString.split('\n').length - 1 // Exclude header
    stats.validRows = transactions.length
    stats.invalidRows = stats.totalRows - stats.validRows

    logger.info(`CSV processing completed for ${fileName}:`, stats)

    return {
      success: true,
      transactions,
      errors,
      stats,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Failed to process CSV: ${errorMessage}`)

    logger.error(`CSV processing failed for ${fileName}:`, error)

    return {
      success: false,
      transactions: [],
      errors,
      stats,
    }
  }
}

/**
 * Process transactions from CSV content with async generator for progress tracking
 */
export async function* processTransactionsFromCSV({
  fileName,
  csvContent,
  userId,
  deduplicateThreshold = DEFAULT_PROCESSING_CONFIG.deduplicateThreshold,
  batchSize = DEFAULT_PROCESSING_CONFIG.batchSize,
  batchDelay = DEFAULT_PROCESSING_CONFIG.batchDelay,
  maxRetries = DEFAULT_PROCESSING_CONFIG.maxRetries,
  retryDelay = DEFAULT_PROCESSING_CONFIG.retryDelay,
}: {
  fileName: string
  csvContent: string
  userId: string
  deduplicateThreshold?: number
  batchSize?: number
  batchDelay?: number
  maxRetries?: number
  retryDelay?: number
}): AsyncGenerator<{
  action: 'created' | 'skipped' | 'merged' | 'updated' | 'invalid'
  transaction?: FinanceTransactionInsert
  error?: string
}> {
  try {
    // First, parse the CSV content
    const parsedTransactions = await parseTransactionString(csvContent, userId)

    // Create a map to track accounts and avoid duplicate account creation
    const accountsMap = new Map<string, any>()

    // Process each parsed transaction
    for (const [accountName, transactionData] of parsedTransactions) {
      try {
        // Get or create the account
        const account = await getOrCreateAccount(accountName, accountsMap, userId)

        // Create the full transaction object
        const transaction: FinanceTransactionInsert = {
          ...transactionData,
          accountId: account.id,
        }

        // Process the transaction with retry logic
        const result = await processTransaction(transaction, { maxRetries, retryDelay })

        yield {
          action: result.action,
          transaction: result.transaction,
        }

        // Add delay between batches if specified
        if (batchDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay))
        }
      } catch (error) {
        logger.error(`Error processing transaction for account ${accountName}:`, error)
        yield {
          action: 'invalid',
          error: error instanceof Error ? error.message : String(error),
        }
      }
    }
  } catch (error) {
    logger.error(`Error processing CSV file ${fileName}:`, error)
    yield {
      action: 'invalid',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get or create an account for the given account name
 */
async function getOrCreateAccount(
  accountName: string,
  accountsMap: Map<string, any>,
  userId: string
): Promise<any> {
  let account = accountsMap.get(accountName)

  if (!account) {
    // Import the account service functions
    const { createAccount, listAccounts } = await import('../core/account.service')

    // First, try to find existing account in database
    const existingAccounts = await listAccounts(userId)
    const existingAccount = existingAccounts.find((acc) => acc.name === accountName)

    if (existingAccount) {
      account = existingAccount
    } else {
      // Create new account
      account = await createAccount({
        type: 'checking',
        balance: '0',
        name: accountName,
        institutionId: null,
        meta: null,
        userId,
      })
    }

    accountsMap.set(accountName, account)
  }

  return account
}
