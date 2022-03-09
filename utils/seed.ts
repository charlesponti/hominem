import * as dotenv from 'dotenv'

dotenv.config()

import logger from '../../src/utils/logger';
import MongoConnection from './mongo-connection';

/**
 * If MONGODB_URL is not defined, log error and kill process
 * because seeding cannot occur.
 */
if (process.env.MONGO_URL === null) {
  logger.log({
    level: 'error',
    message: 'MONGO_URL not specified in environment',
  });
  process.exit(1);
}

/**
 *
 * @param {Function} seedFunction Function which will seed database
 */
export function seed(seedFunction: Function) {

  // Create connection to MongoDB instance
  const mongoConnection = new MongoConnection({ mongoUrl: process.env.MONGO_URL || '' });

  mongoConnection.connect(async () => {
    // Seed database
    await seedFunction();

    // Close the Mongoose connection, when receiving SIGINT
    logger.info({ label: 'seed', message: 'Gracefully shutting down' });

    mongoConnection.close((error) => {
      if (error) {
        logger.error({
          label: 'seed',
          message: 'Error shutting closing mongo connection',
          error,
        });
      }

      process.exit(0);
    });
  });
}
