import chalk from 'chalk'
import { Command } from 'commander'
import { consola } from 'consola'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import ora from 'ora'

export const command = new Command('playwright')
  .description('Run Playwright scrapers')
  .option('-f, --file <file>', 'Specific scraper file to run')
  .option('--headed', 'Run in headed mode (show browser)')
  .option('--debug', 'Run in debug mode')
  .option('--ui', 'Run with Playwright UI')
  .action(async (options) => {
    const scrapeDir = join(process.cwd(), 'scrapes')

    if (!existsSync(scrapeDir)) {
      consola.error(
        chalk.red('Scrapes directory not found. Make sure you are in the CLI app directory.')
      )
      process.exit(1)
    }

    let args = ['test']

    if (options.file) {
      const filePath = join(scrapeDir, options.file)
      if (!existsSync(filePath)) {
        consola.error(chalk.red(`Scraper file not found: ${options.file}`))
        process.exit(1)
      }
      args.push(filePath)
    }

    if (options.headed) {
      args.push('--headed')
    }

    if (options.debug) {
      args.push('--debug')
    }

    if (options.ui) {
      args.push('--ui')
    }

    const spinner = ora(chalk.blue('Running Playwright scrapers...')).start()

    try {
      const playwrightProcess = spawn('npx', ['playwright', ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
      })

      playwrightProcess.on('close', (code) => {
        if (code === 0) {
          spinner.succeed(chalk.green('Scrapers completed successfully'))
        } else {
          spinner.fail(chalk.red('Scrapers failed'))
          process.exit(code || 1)
        }
      })

      playwrightProcess.on('error', (error) => {
        spinner.fail(chalk.red('Failed to run scrapers'))
        consola.error(chalk.red('Error:'), error.message)
        process.exit(1)
      })
    } catch (error) {
      spinner.fail(chalk.red('Failed to run scrapers'))
      consola.error(chalk.red('Error:'), error)
      process.exit(1)
    }
  })

export default command
