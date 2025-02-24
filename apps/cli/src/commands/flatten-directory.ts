import { Command } from 'commander'
import chalk from 'chalk'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

export const program = new Command()

program
  .version('1.0.0')
  .description('Flattens a directory structure by moving all files to the root')
  .option('-d, --dry-run', 'show what would be moved without moving')
  .option('-p, --path <path>', 'path to flatten', '.')
  .parse()

const options = program.opts()

const log = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  const timestamp = new Date().toISOString()
  const color = {
    info: chalk.blue,
    success: chalk.green,
    error: chalk.red,
  }[type]
  console.log(`${chalk.gray(`[${timestamp}]`)} ${color(msg)}`)
}

async function moveFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  const base = path.basename(filePath)

  if (dir === '.' || base.startsWith('.')) return

  let newFile = base
  let counter = 1

  while (await fs.stat(path.join('.', newFile)).catch(() => null)) {
    const ext = path.extname(base)
    const name = path.basename(base, ext)
    newFile = `${name}_${counter}${ext}`
    counter++
  }

  const targetPath = path.join(dir, newFile)

  if (options.dryRun) {
    log(`Would move: ${filePath} → ${targetPath}`)
    return
  }

  try {
    await fs.rename(filePath, targetPath)
    log(`Moved: ${filePath} → ${targetPath}`, 'success')
  } catch (error) {
    log(`Error moving ${filePath}: ${error}`, 'error')
  }
}

async function main() {
  try {
    log('Starting file reorganization...')
    const files = await fs.readdir(options.path, { recursive: true })

    for (const file of files) {
      const filePath = path.join(options.path, file)
      const stat = await fs.stat(filePath)

      if (stat.isFile() && !file.includes('.DS_Store')) {
        await moveFile(filePath)
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
