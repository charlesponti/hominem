#! /usr/bin/env node

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './commands/ai/index.ts'
import authCommand from './commands/auth'
import convertCommand from './commands/convert'
import { command as csvToJSONCommand } from './commands/csv-to-json.ts'
import { command as initCommand } from './commands/init.ts'
import scrapeCommand from './commands/scraper/scrape.ts'
import serveCommand from './commands/serve/index.ts'
import thothCommand from './commands/thoth'
import { initDb } from './db/index.ts'

const foo = 'meow'

async function init() {
  // Initialize the application
  // This is where you can add any global setup code
  await initDb()
  const program = new Command()

  program.version('1.0.0').description('Collection of useful tools')

  program.addCommand(authCommand)
  program.addCommand(initCommand)
  program.addCommand(scrapeCommand)
  program.addCommand(aiCommand)
  program.addCommand(thothCommand)
  program.addCommand(csvToJSONCommand)
  program.addCommand(convertCommand)
  program.addCommand(serveCommand)

  program.parse(process.argv)
}

init().catch((error) => {
  console.error('Error initializing the application:', error)
  process.exit(1)
})
