import { logger as baseLogger } from '@ponti/utils/logger'

// Re-export the logger with transaction-specific context
const logger = baseLogger.child({
  module: 'transactions'
})

export default logger