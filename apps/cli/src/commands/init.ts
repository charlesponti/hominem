import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
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
        consola.info(chalk.blue(`Directory already exists: ${hominemDir}`))
      } catch (error) {
        // Create the directory
        await fs.mkdir(hominemDir, { recursive: true })
        consola.success(chalk.green(`Created directory: ${hominemDir}`))
      }

      // Create empty SQLite database file if it doesn't exist
      const dbPath = path.join(hominemDir, 'db.sqlite')
      try {
        await fs.access(dbPath)
        consola.info(chalk.blue(`Database file already exists: ${dbPath}`))
      } catch (error) {
        // Create empty file
        await fs.writeFile(dbPath, '')
        consola.success(chalk.green(`Created database file: ${dbPath}`))
      }

      // Set environment variable in shell config
      const zshrcPath = path.join(homedir, '.zshrc')
      const envVarLine = `\n# Hominem environment variables\nexport HOMINEM_DB_PATH="${dbPath}"\n`

      try {
        // Check if HOMINEM_DB_PATH already exists in .zshrc
        const zshrcContent = await fs.readFile(zshrcPath, 'utf-8')
        if (zshrcContent.includes('HOMINEM_DB_PATH')) {
          consola.info(chalk.blue('HOMINEM_DB_PATH already set in .zshrc'))
        } else {
          // Append to .zshrc
          await fs.appendFile(zshrcPath, envVarLine)
          consola.success(chalk.green('Added HOMINEM_DB_PATH to .zshrc'))
        }

        consola.success(
          chalk.green(
            '\nInitialization complete! Please run the following command to update your environment:'
          )
        )
        consola.info(chalk.blue('\n  source ~/.zshrc\n'))
        consola.info(
          chalk.blue(`Or restart your terminal and HOMINEM_DB_PATH will be set to: ${dbPath}`)
        )
      } catch (error) {
        consola.error(chalk.red(`Failed to update .zshrc: ${error}`))
        consola.info(
          chalk.blue(`\nPlease manually add this line to your shell config file:\n${envVarLine}`)
        )
      }
    } catch (error) {
      consola.error(chalk.red('Initialization failed:'), error)
      process.exit(1)
    }
  })

export default command
