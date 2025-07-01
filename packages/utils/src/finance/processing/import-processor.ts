import { parse } from 'csv-parse'
import { Effect, Stream } from 'effect'
import type { FinanceTransactionInsert } from '../../db/schema'
import { logger } from '../../logger'
import { getAndCreateAccountsInBulk } from '../core/account.service'
import {
  convertCapitalOneTransaction,
  convertCopilotTransaction,
  type CapitalOneTransaction,
  type CopilotTransaction,
} from './bank-adapters'
import { processTransactionsInBulk } from './transaction-processor'

export type ParsedTransactions = [string, Omit<FinanceTransactionInsert, 'accountId'>][]

class CsvParseError {
  readonly _tag = 'CsvParseError'
  constructor(readonly error: Error) {}
}

export function parseTransactionStream(
  csvStream: NodeJS.ReadableStream,
  userId: string
): Stream.Stream<ParsedTransactions, CsvParseError> {
  return Stream.async<ParsedTransactions, CsvParseError>((emit) => {
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
        if (record === null) {
          break
        }
        try {
          const bankFormat = detectBankFormat(Object.keys(record))
          if (bankFormat === 'copilot') {
            const copilotTx = record as CopilotTransaction
            const accountName = copilotTx.account
            const convertedTx = convertCopilotTransaction(copilotTx, userId)
            emit.single([[accountName, convertedTx]])
          } else if (bankFormat === 'capital-one') {
            const capitalOneTx = record as CapitalOneTransaction
            const accountName = `Capital One ${capitalOneTx['Account Number']}`
            const convertedTx = convertCapitalOneTransaction(capitalOneTx, '', userId)
            emit.single([[accountName, convertedTx]])
          } else {
            logger.warn('Unknown bank format, skipping row:', record)
          }
        } catch (error) {
          logger.error('Error processing transaction row:', error, record)
        }
      }
    })

    parser.on('error', (err) => {
      emit.fail(new CsvParseError(err))
    })

    parser.on('end', () => {
      emit.end()
    })

    csvStream.pipe(parser)
  })
}

function detectBankFormat(headers: string[]): 'copilot' | 'capital-one' | 'unknown' {
  const headerSet = new Set(headers.map((h) => h.toLowerCase()))

  if (
    headerSet.has('date') &&
    headerSet.has('name') &&
    headerSet.has('amount') &&
    headerSet.has('type')
  ) {
    return 'copilot'
  }

  if (
    headerSet.has('transaction date') &&
    headerSet.has('transaction amount') &&
    headerSet.has('transaction description')
  ) {
    return 'capital-one'
  }

  return 'unknown'
}

export function processTransactionsFromCSV({
  csvContent,
  userId,
}: {
  csvContent: string
  userId: string
}) {
  return Effect.gen(function* ($) {
    const { Readable } = yield* $(Effect.tryPromise(() => import('stream')))
    const csvStream = Readable.from(csvContent)
    const parsedTransactions = yield* $(
      Stream.runCollect(parseTransactionStream(csvStream, userId))
    ).pipe(Effect.map((chunk) => Array.from(chunk)))
    const uniqueAccountNames = [
      ...new Set(parsedTransactions.flatMap((tx) => tx.map(([accountName]) => accountName))),
    ]
    const accountsMap = yield* $(
      Effect.tryPromise(() => getAndCreateAccountsInBulk(uniqueAccountNames, userId))
    )

    const transactionsToProcess: FinanceTransactionInsert[] = parsedTransactions
      .flatMap((tx) => tx)
      .map(([accountName, transactionData]) => {
        const account = accountsMap.get(accountName)
        return {
          ...transactionData,
          // biome-ignore lint/style/noNonNullAssertion: Account should always be found in the map
          accountId: account!.id,
        }
      })

    return yield* $(Effect.tryPromise(() => processTransactionsInBulk(transactionsToProcess)))
  })
}
