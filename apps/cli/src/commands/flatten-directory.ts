import { logger } from '@ponti/utils/logger'
import chalk from 'chalk'
import { Command } from 'commander'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

export const program = new Command()

program
  .version('1.0.0')
  .name('flatten-directory')
  .description('Flattens a directory structure by moving all files to the root')
  .option('-d, --dry-run', 'show what would be moved without moving')
  .option('-p, --path <path>', 'path to flatten', '.')
  .action(main)

const log = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  const timestamp = new Date().toISOString()
  const color = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
  }[type]
  logger.info(`${chalk.gray(`[${timestamp}]`)} ${color(msg)}`)
}

async function moveFile(filePath: string, options: { dryRun: boolean }): Promise<void> {
  // directory to move the file to
  const dir = path.dirname(filePath)
  // base name of the file
  const base = path.basename(filePath)

  // ignore hidden files
  if (dir === '.' || base.startsWith('.')) return

  let newFile = base
  let counter = 1

  /**
   * Ensure the new file name is unique.
   *
   * If the file already exists, append a number to the file name.
   * Increase the count until a unique file name is found.
   */
  while (await fs.stat(path.join(dir, newFile)).catch(() => null)) {
    const ext = path.extname(base)
    const name = path.basename(base, ext)
    newFile = `${name}_${counter}${ext}`
    counter++
  }

  const targetPath = path.join(dir, newFile)

  if (options.dryRun) {
    logger.info(`Would move: ${filePath} → ${targetPath}`)
    return
  }

  try {
    await fs.rename(filePath, targetPath)
    logger.info(`Moved: ${filePath} → ${targetPath}`)
  } catch (error) {
    logger.error(`Error moving ${filePath}: ${error}`)
  }
}

async function main(options: { dryRun: boolean; path: string }): Promise<void> {
  try {
    logger.info('Starting file reorganization...')
    const files = await fs.readdir(options.path, { recursive: true })

    for (const file of files) {
      const filePath = path.join(options.path, file)
      const stat = await fs.stat(filePath)

      if (stat.isFile() && !file.includes('.DS_Store')) {
        await moveFile(filePath, { dryRun: options.dryRun })
      }
    }

    log('Finished file reorganization', 'success')
  } catch (error) {
    log(`Failed to process files: ${error}`, 'error')
    process.exit(1)
  }
}

if (require.main === module) {
  program.parse(process.argv)
}
