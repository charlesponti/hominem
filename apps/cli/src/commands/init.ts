import { logger } from '@/logger'
import { Command } from 'commander'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const command = new Command('init')
  .description('Initialize Hominem environment')
  .action(async () => {
    try {
      // Create .hominem directory
      const homedir = os.homedir()
      const hominemDir = path.join(homedir, '.hominem')

      // Check if directory exists
      try {
        await fs.access(hominemDir)
        logger.info(`Directory already exists: ${hominemDir}`)
      } catch (error) {
        // Create the directory
        await fs.mkdir(hominemDir, { recursive: true })
        logger.info(`Created directory: ${hominemDir}`)
      }

      // Create empty SQLite database file if it doesn't exist
      const dbPath = path.join(hominemDir, 'db.sqlite')
      try {
        await fs.access(dbPath)
        logger.info(`Database file already exists: ${dbPath}`)
      } catch (error) {
        // Create empty file
        await fs.writeFile(dbPath, '')
        logger.info(`Created database file: ${dbPath}`)
      }

      // Set environment variable in shell config
      const zshrcPath = path.join(homedir, '.zshrc')
      const envVarLine = `\n# Hominem environment variables\nexport HOMINEM_DB_PATH="${dbPath}"\n`

      try {
        // Check if HOMINEM_DB_PATH already exists in .zshrc
        const zshrcContent = await fs.readFile(zshrcPath, 'utf-8')
        if (zshrcContent.includes('HOMINEM_DB_PATH')) {
          logger.info('HOMINEM_DB_PATH already set in .zshrc')
        } else {
          // Append to .zshrc
          await fs.appendFile(zshrcPath, envVarLine)
          logger.info('Added HOMINEM_DB_PATH to .zshrc')
        }

        logger.info(
          '\nInitialization complete! Please run the following command to update your environment:'
        )
        logger.info('\n  source ~/.zshrc\n')
        logger.info(`Or restart your terminal and HOMINEM_DB_PATH will be set to: ${dbPath}`)
      } catch (error) {
        logger.error(`Failed to update .zshrc: ${error}`)
        logger.info(`\nPlease manually add this line to your shell config file:\n${envVarLine}`)
      }
    } catch (error) {
      logger.error('Initialization failed:', error)
      process.exit(1)
    }
  })
