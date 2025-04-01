import winston from 'winston'

// Define custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`
  })
)

// Create the logger instance
export const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      dirname: 'logs',
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'combined.log',
      dirname: 'logs',
    }),
  ],
})

// Export the logger instance
export default logger

// Export common logging methods
export const debug = logger.debug.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
